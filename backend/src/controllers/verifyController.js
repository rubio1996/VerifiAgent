const prisma           = require('../lib/prisma');
const { v4: uuidv4 }   = require('uuid');
const crypto           = require('crypto');
const fuzz             = require('fuzzball');

const { runOCR }       = require('../services/ocrService');
const { callGroq }     = require('../services/groqService');
const { checkAML }     = require('../services/amlService');
const { generatePDF }  = require('../services/pdfService');
const { validateMrzFromOcr, detectMrzInText } = require('../services/mrzService');

function normalizeUserData(body) {
  return {
    nombre:   body.firstName,
    apellido: body.lastName,
    email:    body.email,
    tel:      body.phone,
    nac:      body.nationality,
    pais:     body.country,
    fecha:    body.birthDate,
    ndoc:     body.documentNumber,
    docType:  body.docType || 'DNI'
  };
}

async function startVerification(req, res, next) {
  try {
    const userData = normalizeUserData(req.body);

    if (!userData.nombre || !userData.apellido || !userData.ndoc) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, apellido, ndoc).' });
    }

    const verification = await prisma.verification.create({
      data: {
        id:     uuidv4(),
        userId: req.user.userId,
        status: 'PENDING',
      },
    });

    await prisma.riskAssessment.create({
      data: {
        id:             uuidv4(),
        verificationId: verification.id,
        declaredData:   userData,
      },
    });

    res.status(201).json({
      verificationId: verification.id,
      status:         'PENDING',
      message:        'Verificación iniciada con éxito.',
    });
  } catch (err) {
    next(err);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { side, docType: docTypeFromBody } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo de imagen.' });

    const verification = await prisma.verification.findUnique({ where: { id } });
    if (!verification) return res.status(404).json({ error: 'Sesión de verificación no encontrada.' });
    if (verification.userId !== req.user.userId) return res.status(403).json({ error: 'Acceso no autorizado.' });

    const assessment = await prisma.riskAssessment.findUnique({ where: { verificationId: id } });
    const userData   = assessment?.declaredData || {};

    // ─── Validación cara anverso/reverso ──────────────────────────────────
    const effectiveDocTypeForSide = docTypeFromBody || assessment?.declaredData?.docType || 'DNI';
    const SINGLE_SIDE_TYPES_CTRL = ['Pasaporte', 'Cédula'];
    if (!SINGLE_SIDE_TYPES_CTRL.includes(effectiveDocTypeForSide)) {
      const existingDocs = await prisma.document.findMany({ where: { verificationId: id } });
      const sideAlreadyUploaded = existingDocs.find(d => d.side === side);
      if (sideAlreadyUploaded) {
        // Sobrescribimos en lugar de rechazar con 400
        // Evita el bloqueo cuando el lado quedó a medias en un intento anterior
        console.warn(`[UPLOAD] Lado ${side} ya existía en ${id}. Sobrescribiendo...`);
        await prisma.document.deleteMany({ where: { verificationId: id, side: side } });
      }
    }

    // ─── OCR ─────────────────────────────────────────────────────────────
    let ocrResult = null;
    try {
      ocrResult = await runOCR(req.file.buffer);
    } catch (ocrErr) {
      console.warn(`[OCR WARNING] Error en lectura de ${side}:`, ocrErr.message);
    }

    // ─── Validación semántica de la cara del documento ────────────────────
    if (!SINGLE_SIDE_TYPES_CTRL.includes(effectiveDocTypeForSide) && ocrResult) {
      const ocrUpper = ocrResult.toUpperCase();
      const hasMrz = detectMrzInText(ocrResult);

      const frontIndicators = [
        'APELLIDOS', 'FECHA DE NACIMIENTO', 'DATE OF BIRTH',
        'NATIONALITY', 'NACIONALIDAD', 'SEXO', 'VÁLIDO HASTA', 'VALID UNTIL'
      ];

      const backIndicators = [
        'DOMICILIO', 'LUGAR DE NACIMIENTO', 'NOMBRE DEL PADRE',
        'NOMBRE DE LA MADRE', 'DATOS FILIATORIOS', 'HUELLA DACTILAR',
        'FINGERPRINT', 'PARENTAGE', 'I<<ESP', 'P<ESP',
        'CAN', 'IDESP', 'SOPORTE', 'NUM SOPORTE'
      ];

      const frontScore = frontIndicators.filter(ind => ocrUpper.includes(ind)).length;
      let backScore  = backIndicators.filter(ind => ocrUpper.includes(ind)).length;
      if (hasMrz) backScore += 3;

      const likelySide = frontScore >= backScore ? 'front' : 'back';

      if (likelySide !== side && (frontScore + backScore) >= 2) {
        const expected = side === 'front' ? 'anverso' : 'reverso';
        const detected = likelySide === 'front' ? 'anverso' : 'reverso';
        return res.status(422).json({
          error: `Cara incorrecta detectada: has subido una imagen que parece el ${detected} pero seleccionaste ${expected}. Por favor revisa qué lado estás subiendo.`,
          detectedSide: likelySide,
          requestedSide: side,
        });
      }
    }

    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const storageUrl = `local://${id}/${side}_${Date.now()}.jpg`;
    const mapType = { DNI: 'DNI', NIE: 'NIE', Pasaporte: 'PASAPORTE', Cédula: 'CEDULA' };

    const newDoc = await prisma.document.create({
      data: {
        id: uuidv4(),
        verificationId: id,
        type: mapType[docTypeFromBody] || mapType[userData.docType] || 'DNI',
        side: side,
        storageUrl,
        ocrResult,
        hash,
      },
    });

    if (docTypeFromBody && docTypeFromBody !== userData.docType) {
      await prisma.riskAssessment.update({
        where: { verificationId: id },
        data: { declaredData: { ...userData, docType: docTypeFromBody } },
      });
    }

    const existingDocs = await prisma.document.findMany({ where: { verificationId: id, id: { not: newDoc.id } } });
    const allDocs = [...existingDocs, newDoc];

    const SINGLE_SIDE_TYPES = ['Pasaporte', 'Cédula'];
    const effectiveDocType = docTypeFromBody || userData.docType;
    const isReady = SINGLE_SIDE_TYPES.includes(effectiveDocType) ? allDocs.length >= 1 : allDocs.length >= 2;

    if (isReady) {
      runFullAnalysis(id, req.user.userId, allDocs, userData).catch(console.error);
    }

    res.json({
      documentId: newDoc.id,
      analysisStarted: isReady,
      message: isReady ? 'Documentos completos. Iniciando análisis...' : 'Lado recibido correctamente.'
    });
  } catch (err) {
    next(err);
  }
}

// ─── Reset de un lado del documento (permite resubida manual sin bloqueo) ─────
async function resetDocumentSide(req, res, next) {
  try {
    const { id, side } = req.params;

    const verification = await prisma.verification.findUnique({ where: { id } });
    if (!verification) return res.status(404).json({ error: 'Verificación no encontrada.' });
    if (verification.userId !== req.user.userId) return res.status(403).json({ error: 'Acceso no autorizado.' });

    await prisma.document.deleteMany({ where: { verificationId: id, side: side } });
    await prisma.verification.update({ where: { id }, data: { status: 'PENDING' } });

    res.json({ message: `Lado ${side} eliminado. Puedes volver a subirlo.` });
  } catch (err) {
    next(err);
  }
}

async function runFullAnalysis(verificationId, userId, docs, userData) {
  try {
    await prisma.verification.update({ where: { id: verificationId }, data: { status: 'PROCESSING' } });

    // ─── OCR y scores ────────────────────────────────────────────────────
    const fullTextOCR = docs.map(d => d.ocrResult || '').join(' ').toUpperCase();
    const cleanOCR = fullTextOCR.replace(/[\n\r]/g, ' ');

    const nombreCompleto = `${userData.nombre} ${userData.apellido}`.toUpperCase();
    const nameSim = Math.max(
      fuzz.partial_ratio(userData.nombre.toUpperCase(), cleanOCR),
      fuzz.token_set_ratio(nombreCompleto, cleanOCR),
      fuzz.partial_ratio(userData.apellido.toUpperCase(), cleanOCR)
    );

    // ─── Comparación FUZZY del número de documento ────────────────────────
    function normalizeDocNumber(n) {
      return n.toUpperCase().replace(/[\.\-\s]/g, '').trim();
    }

    function docNumberFuzzyMatch(normalizedUserDoc, cleanOCR) {
      // 1. Exacto — rápido y sin coste
      if (cleanOCR.includes(normalizedUserDoc)) return true;

      // 2. Fuzzy por palabras — tolera 2 chars mal leídos (0→O, 1→I, Z→2, etc.)
      const docLen = normalizedUserDoc.length;
      const words = cleanOCR.split(/\s+/);
      for (const word of words) {
        const cleaned = word.replace(/[\.\-\s]/g, '');
        if (Math.abs(cleaned.length - docLen) <= 2) {
          const sim = fuzz.ratio(normalizedUserDoc, cleaned);
          if (sim >= 75) return true;
        }
      }

      // 3. Ventana deslizante sobre texto sin espacios
      //    Captura números fragmentados por Tesseract en fotos de móvil
      const noSpaces = cleanOCR.replace(/\s+/g, '');
      for (let i = 0; i <= noSpaces.length - docLen; i++) {
        const window = noSpaces.substring(i, i + docLen);
        const sim = fuzz.ratio(normalizedUserDoc, window);
        if (sim >= 75) return true;
      }

      return false;
    }

    const normalizedUserDoc = normalizeDocNumber(userData.ndoc);
    const docIdMatch = normalizedUserDoc.length >= 4 && docNumberFuzzyMatch(normalizedUserDoc, cleanOCR);

    // nameSim >= 55: bajado de 65, fotos reales de móvil dan scores más bajos
    const nameMatch = nameSim >= 55;

    const scores = calculateScores(userData, docs);

    // ─── Logs de diagnóstico ──────────────────────────────────────────────
    console.log(`[OCR DEBUG] Texto extraído (primeros 300 chars): ${cleanOCR.substring(0, 300)}`);
    console.log(`[OCR DEBUG] nameSim: ${nameSim} | nameMatch: ${nameMatch}`);
    console.log(`[OCR DEBUG] ndoc buscado: ${normalizedUserDoc} | docIdMatch: ${docIdMatch}`);

    // ─── VALIDACIÓN OCR con tres niveles ─────────────────────────────────
    //   - Ambos coinciden                         → APPROVED
    //   - Al menos algo coincide (sim>=40 o docId) → REVIEW
    //   - Nada coincide                           → REJECTED
    const ocrValid   = nameMatch && docIdMatch;
    const ocrPartial = nameSim >= 40 || docIdMatch;

    if (!ocrValid && !ocrPartial) {
      console.warn(`[SECURITY] OCR mismatch total en ${verificationId}. Forzando REJECTED.`);
      scores.result     = 'rejected';
      scores.trustScore = Math.min(scores.trustScore, 40);
      scores.fraudScore = Math.max(scores.fraudScore, 60);
    } else if (!ocrValid && ocrPartial) {
      console.warn(`[SECURITY] OCR coincidencia parcial en ${verificationId}. Enviando a REVIEW.`);
      scores.result     = 'review';
      scores.trustScore = Math.min(scores.trustScore, 70);
      scores.fraudScore = Math.max(scores.fraudScore, 30);
    } else {
      scores.result     = 'approved';
      scores.trustScore = Math.max(scores.trustScore, 95);
    }

    // ─── Consulta AML ────────────────────────────────────────────────────
    const amlResult = await checkAML(`${userData.nombre} ${userData.apellido}`, userData);
    console.log(`[AML] Resultado para ${userData.nombre} ${userData.apellido}:`, amlResult.message);

    if (amlResult.isAlert) {
      console.warn(`[SECURITY] ⚠️  ALERTA AML ACTIVA para ${userData.nombre} ${userData.apellido}. Forzando REJECTED.`);
      scores.result     = 'aml_flagged';
      scores.fraudScore = 95;
      scores.trustScore = 5;
    }

    const docTypeMap = { CEDULA: 'Cédula', DNI: 'DNI', NIE: 'NIE', PASAPORTE: 'Pasaporte' };
    const docTypeReal = docTypeMap[docs[0]?.type] || userData.docType;
    const userDataWithDocType = { ...userData, docType: docTypeReal };

    // ─── Validación MRZ (ICAO 9303) ───────────────────────────────────────
    const MRZ_DOC_TYPES = ['DNI', 'NIE', 'Pasaporte'];
    let mrzResult = null;
    let mrzValid = null;
    let mrzMatch = null;

    if (MRZ_DOC_TYPES.includes(docTypeReal)) {
      mrzResult = validateMrzFromOcr(cleanOCR, userDataWithDocType, docTypeReal);
      mrzValid = mrzResult.found ? mrzResult.checkDigitsValid : null;
      mrzMatch = mrzResult.found ? mrzResult.dataMatch : null;

      console.log(`[MRZ] found=${mrzResult.found} format=${mrzResult.format} valid=${mrzValid} match=${mrzMatch}`);
      if (mrzResult.found) {
        console.log(`[MRZ] ${mrzResult.message}`);
        if (mrzResult.comparison) {
          console.log(`[MRZ DEBUG] nameSim=${mrzResult.comparison.nameSim} dob=${mrzResult.comparison.birthDateMatch} nat=${mrzResult.comparison.nationalityMatch}`);
        }
      }

      if (mrzResult.found && !mrzResult.checkDigitsValid) {
        console.warn(`[SECURITY] MRZ con dígitos de control inválidos en ${verificationId}.`);
        scores.result     = 'review';
        scores.trustScore = Math.min(scores.trustScore, 55);
        scores.fraudScore = Math.max(scores.fraudScore, 45);
      } else if (mrzResult.found && mrzResult.checkDigitsValid && !mrzResult.dataMatch) {
        console.warn(`[SECURITY] MRZ válida pero datos no coinciden en ${verificationId}.`);
        scores.result     = 'review';
        scores.trustScore = Math.min(scores.trustScore, 65);
        scores.fraudScore = Math.max(scores.fraudScore, 35);
      } else if (mrzResult.found && mrzResult.dataMatch) {
        console.log(`[MRZ] Validación MRZ completa — refuerzo de confianza en ${verificationId}.`);
        scores.result     = 'approved';
        scores.trustScore = Math.max(scores.trustScore, 96);
        scores.fraudScore = Math.min(scores.fraudScore, 8);
      }
    }

    const effectiveOcrMatch = ocrValid || mrzMatch === true;

    // ─── Informe IA (Groq) ────────────────────────────────────────────────
    let aiReport = '';
    try {
      aiReport = await callGroq(userDataWithDocType, scores, amlResult);
    } catch (groqErr) {
      console.warn('[GROQ ERROR]:', groqErr.message);
      aiReport = amlResult.isAlert
        ? `ALERTA CRÍTICA: El sujeto ${userData.nombre} ${userData.apellido} ha sido identificado en listas de sanciones internacionales. ${amlResult.message}`
        : `ANÁLISIS AUTOMÁTICO: Nombre: ${nameMatch ? 'SÍ' : 'NO'} (${nameSim}%). Documento: ${docIdMatch ? 'SÍ' : 'NO'}. Trust Score: ${scores.trustScore}%.`;
    }

    // ─── Status final ─────────────────────────────────────────────────────
    const finalStatus = amlResult.isAlert
      ? 'REJECTED'
      : (scores.result === 'approved' ? 'APPROVED' : (scores.result === 'review' ? 'REVIEW' : 'REJECTED'));

    const riskLevel = amlResult.isAlert
      ? 'HIGH'
      : (scores.trustScore >= 80 ? 'LOW' : (scores.trustScore >= 50 ? 'MEDIUM' : 'HIGH'));

    await prisma.riskAssessment.update({
      where: { verificationId },
      data: {
        amlCheck: amlResult.message,
        amlAlert: amlResult.isAlert,
        ocrMatch: effectiveOcrMatch,
        mrzValid,
        mrzMatch,
        aiReport,
        riskLevel,
      }
    });

    await prisma.verification.update({
      where: { id: verificationId },
      data: { status: finalStatus, docScore: scores.docScore, fraudScore: scores.fraudScore, riskScore: scores.trustScore, completedAt: new Date() }
    });

  } catch (err) {
    console.error('[CRITICAL ANALYSIS ERROR]:', err);
    await prisma.verification.update({ where: { id: verificationId }, data: { status: 'REJECTED' } }).catch(() => {});
  }
}

async function getResult(req, res, next) {
  try {
    const verif = await prisma.verification.findUnique({
      where: { id: req.params.id },
      include: { riskAssessment: true, documents: true }
    });

    if (!verif) return res.status(404).json({ error: 'Verificación no encontrada.' });
    if (verif.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    res.json({
      id:          verif.id,
      status:      verif.status,
      docScore:    verif.docScore,
      fraudScore:  verif.fraudScore,
      trustScore:  verif.riskScore,
      aiReport:    verif.riskAssessment?.aiReport,
      amlResult:   verif.riskAssessment?.amlCheck,
      amlAlert:    verif.riskAssessment?.amlAlert ?? false,
      ocrMatch:    verif.riskAssessment?.ocrMatch,
      mrzValid:    verif.riskAssessment?.mrzValid ?? null,
      mrzMatch:    verif.riskAssessment?.mrzMatch ?? null,
      mrzMessage:  verif.riskAssessment?.mrzValid != null
        ? (verif.riskAssessment.mrzMatch
          ? 'Zona MRZ válida y coherente con los datos declarados.'
          : (verif.riskAssessment.mrzValid
            ? 'MRZ legible pero con discrepancias en los datos.'
            : 'MRZ detectada con dígitos de control inválidos.'))
        : null,
      completedAt: verif.completedAt
    });
  } catch (err) {
    next(err);
  }
}

async function downloadReport(req, res, next) {
  try {
    const verif = await prisma.verification.findUnique({
      where: { id: req.params.id },
      include: { riskAssessment: true }
    });

    if (!verif) return res.status(404).json({ error: 'Registro no encontrado.' });
    if (verif.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const userData = verif.riskAssessment?.declaredData || {};
    const pdfBuffer = await generatePDF(verif, userData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=VerifID_Report_${verif.id.slice(0, 8)}.pdf`);

    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error en downloadReport:', err);
    next(err);
  }
}

function calculateScores(userData, docs) {
  let doc = 95;

  if (docs.length >= 2) doc += 4;
  if (userData.pais === 'España') doc += 1;

  doc = Math.min(99, doc);

  const fraud = 2;
  const trust = Math.round((doc * 0.8) + ((100 - fraud) * 0.2));

  return { docScore: doc, fraudScore: fraud, trustScore: trust, result: 'approved' };
}

async function getStatus(req, res, next) {
  try {
    const verif = await prisma.verification.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, userId: true, completedAt: true }
    });

    if (!verif) return res.status(404).json({ error: 'Verificación no encontrada.' });
    if (verif.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    res.json({ id: verif.id, status: verif.status, completedAt: verif.completedAt });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startVerification,
  uploadDocument,
  resetDocumentSide,
  getResult,
  downloadReport,
  getStatus
};