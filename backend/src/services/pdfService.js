const PDFDocument = require('pdfkit');

async function generatePDF(verif, userData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      autoFirstPage: true,
      bufferPages: true,
      info: { Title: `Informe VerifID - ${verif.id}` }
    });

    const DOC_TYPE_LABELS = {
      DNI:       'DNI (Documento Nacional de Identidad)',
      NIE:       'NIE (Número de Identidad de Extranjero)',
      PASAPORTE: 'Pasaporte',
      CEDULA:    'Cédula de Identidad',
      Pasaporte: 'Pasaporte',
      Cédula:    'Cédula de Identidad',
    };
    const docTypeLabel = DOC_TYPE_LABELS[userData.docType] || userData.docType || 'DNI';

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const isApproved = verif.status === 'APPROVED';
    const isAmlAlert = verif.riskAssessment?.amlAlert === true ||
      (verif.riskAssessment?.amlCheck || '').toUpperCase().includes('ALERTA AML');

    // ─── Traducción de estados al español ────────────────────────────────
    const STATUS_ES = {
      APPROVED:   'APROBADO',
      REJECTED:   'RECHAZADO',
      REVIEW:     'EN REVISIÓN',
      PENDING:    'PENDIENTE',
      PROCESSING: 'PROCESANDO',
    };
    const statusLabel = STATUS_ES[verif.status] || verif.status;

    // ─── ENCABEZADO ──────────────────────────────────────────────────────
    doc.fillColor('#1a2a6c').fontSize(22).text('VERIFID AGENT', { align: 'center', characterSpacing: 2 });
    doc.fillColor('#000').fontSize(10).text('Sistema KYC con Inteligencia Artificial', { align: 'center' });
    doc.moveDown(1.5);

    // ─── BLOQUE DE RESULTADO ─────────────────────────────────────────────
    const statusColor = isApproved ? '#27ae60' : '#e74c3c';
    const resultY = doc.y;
    doc.rect(50, resultY, 500, 40).fill('#f8f9fa');
    doc.fillColor(statusColor).fontSize(16).text(`RESULTADO: ${statusLabel}`, 60, resultY + 12);
    doc.moveDown(2.5);

    // ─── BLOQUE DE ALERTA AML ─────────────────────────────────────────────
    if (isAmlAlert) {
      const alertY = doc.y;
      doc.rect(50, alertY, 500, 80).fill('#fdf2f2').stroke('#e74c3c');
      doc.rect(50, alertY, 8, 80).fill('#e74c3c');
      doc.fillColor('#c0392b').fontSize(13).font('Helvetica-Bold')
        .text('⚠  ALERTA DE ALTA PELIGROSIDAD — SUJETO SANCIONADO', 68, alertY + 10);
      doc.font('Helvetica').fontSize(9).fillColor('#333333')
        .text(
          'Este individuo ha sido identificado en listas de vigilancia de sanciones internacionales (AML/PEP). ' +
          'El sistema ha bloqueado automáticamente esta verificación. Se requiere notificación inmediata ' +
          'al departamento de cumplimiento y a las autoridades competentes.',
          68, alertY + 30, { width: 470 }
        );
      doc.moveDown(4);
    }

    // ─── DETALLES DEL USUARIO ─────────────────────────────────────────────
    doc.fillColor('#1a2a6c').fontSize(14).font('Helvetica').text('Detalles del Usuario', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(11);
    doc.text('Nombre: ', { continued: true }).font('Helvetica-Bold').text(`${userData.nombre} ${userData.apellido}`).font('Helvetica');
    doc.text(`Email: ${userData.email || 'N/A'}`);
    doc.text(`Documento: ${docTypeLabel} — Nº ${userData.ndoc}`);
    doc.text(`Nacionalidad: ${userData.nac}`);
    doc.moveDown();

    // ─── ANÁLISIS DE RIESGO ───────────────────────────────────────────────
    doc.fillColor('#1a2a6c').fontSize(14).text('Análisis de Riesgo', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(11);
    doc.text(`Confianza Documental: ${verif.docScore}%`);
    doc.text(`Riesgo de Fraude: ${verif.fraudScore}%`);
    doc.text('Puntuación Global de Confianza: ', { continued: true })
      .fillColor(statusColor).text(`${verif.riskScore}%`).fillColor('#000');
    doc.text(`Validación OCR: ${verif.riskAssessment?.ocrMatch ? 'EXITOSA (COINCIDENCIA DETECTADA)' : 'DISCREPANCIA DETECTADA'}`);

    const amlText = verif.riskAssessment?.amlCheck || 'No procesado';
    doc.text('AML/PEP Status: ', { continued: true })
      .fontSize(10)
      .fillColor(isAmlAlert ? '#c0392b' : '#27ae60')
      .font(isAmlAlert ? 'Helvetica-Bold' : 'Helvetica')
      .text(amlText)
      .fillColor('#000').font('Helvetica');
    doc.moveDown();

    // ─── INFORME DE IA ────────────────────────────────────────────────────
    doc.fillColor('#1a2a6c').fontSize(14).font('Helvetica').text('Informe Narrativo de IA', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#333').fontSize(10)
      .text(verif.riskAssessment?.aiReport || 'Sin informe narrativo disponible.', { align: 'justify' });

    // ─── PIE DE PÁGINA ────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#bdc3c7');
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#888888')
      .text('Este documento ha sido generado automáticamente y contiene datos sensibles sujetos al RGPD.', { align: 'center' });
    doc.text(`Fecha del informe: ${new Date().toLocaleString()} | ID: ${verif.id.slice(0, 8)}`, { align: 'center' });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
    }

    doc.end();
  });
}

module.exports = { generatePDF };