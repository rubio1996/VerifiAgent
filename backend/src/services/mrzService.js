function tokenSetRatio(a, b) {
  const tokensA = (a || '').toUpperCase().split(/\s+/).filter(Boolean);
  const tokensB = (b || '').toUpperCase().split(/\s+/).filter(Boolean);
  if (!tokensA.length || !tokensB.length) return 0;

  const setB = new Set(tokensB);
  const intersection = tokensA.filter(t => setB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return Math.round((intersection / union) * 100);
}

function partialRatio(needle, haystack) {
  const n = (needle || '').toUpperCase();
  const h = (haystack || '').toUpperCase();
  if (!n || !h) return 0;
  if (h.includes(n)) return 100;

  let best = 0;
  for (let i = 0; i <= h.length - n.length; i++) {
    const window = h.slice(i, i + n.length);
    let matches = 0;
    for (let j = 0; j < n.length; j++) {
      if (n[j] === window[j]) matches++;
    }
    best = Math.max(best, Math.round((matches / n.length) * 100));
  }
  return best;
}

function stringRatio(a, b) {
  const left = (a || '').toUpperCase();
  const right = (b || '').toUpperCase();
  if (!left || !right) return 0;
  if (left === right) return 100;

  const maxLen = Math.max(left.length, right.length);
  let matches = 0;
  const minLen = Math.min(left.length, right.length);
  for (let i = 0; i < minLen; i++) {
    if (left[i] === right[i]) matches++;
  }
  return Math.round((matches / maxLen) * 100);
}

const WEIGHTS = [7, 3, 1];

function charValue(ch) {
  if (ch === '<' || ch === ' ') return 0;
  if (ch >= '0' && ch <= '9') return parseInt(ch, 10);
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 55;
  return 0;
}

function computeCheckDigit(field) {
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    sum += charValue(field[i]) * WEIGHTS[i % 3];
  }
  return String(sum % 10);
}

function verifyCheckDigit(field, checkChar) {
  if (!field || checkChar === '<' || checkChar === undefined) return false;
  return computeCheckDigit(field) === checkChar;
}

function cleanMrzLine(line) {
  return (line || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[«‹›|]/g, '<')
    .replace(/[^A-Z0-9<]/g, '');
}

function isMrzLike(line) {
  if (!line || line.length < 26) return false;
  const validChars = (line.match(/[A-Z0-9<]/g) || []).length;
  const fillerRatio = (line.match(/</g) || []).length / line.length;
  return validChars / line.length >= 0.85 && (fillerRatio >= 0.05 || line.startsWith('P<') || line.includes('ESP'));
}

function padMrzLine(line, length) {
  const cleaned = cleanMrzLine(line);
  if (cleaned.length >= length) return cleaned.slice(0, length);
  return cleaned.padEnd(length, '<');
}

function parseNamesFromMrz(raw) {
  const cleaned = raw.replace(/<+$/, '');
  const parts = cleaned.split('<<').filter(Boolean);
  const surname = (parts[0] || '').replace(/</g, ' ').trim();
  const givenNames = parts.slice(1).join(' ').replace(/</g, ' ').trim();
  return { surname, givenNames };
}

function parseTd1(lines) {
  const [l1, l2, l3] = lines.map(l => padMrzLine(l, 30));
  const { surname, givenNames } = parseNamesFromMrz(l3);

  return {
    format: 'TD1',
    documentCode: l1.slice(0, 2),
    issuingCountry: l1.slice(2, 5),
    documentNumber: l1.slice(5, 14),
    documentNumberCheck: l1[14],
    optionalData1: l1.slice(15, 30),
    birthDate: l2.slice(0, 6),
    birthDateCheck: l2[6],
    sex: l2[7],
    expiryDate: l2.slice(8, 14),
    expiryDateCheck: l2[14],
    nationality: l2.slice(15, 18),
    optionalData2: l2.slice(18, 29),
    compositeCheck: l2[29],
    surname,
    givenNames,
    lines: [l1, l2, l3],
  };
}

function parseTd3(lines) {
  const [l1, l2] = lines.map(l => padMrzLine(l, 44));
  const { surname, givenNames } = parseNamesFromMrz(l1.slice(5));

  return {
    format: 'TD3',
    documentCode: l1.slice(0, 2),
    issuingCountry: l1.slice(2, 5),
    documentNumber: l2.slice(0, 9),
    documentNumberCheck: l2[9],
    nationality: l2.slice(10, 13),
    birthDate: l2.slice(13, 19),
    birthDateCheck: l2[19],
    sex: l2[20],
    expiryDate: l2.slice(21, 27),
    expiryDateCheck: l2[27],
    personalNumber: l2.slice(28, 42),
    personalNumberCheck: l2[42],
    compositeCheck: l2[43],
    surname,
    givenNames,
    lines: [l1, l2],
  };
}

function validateTd1Checks(parsed) {
  const [l1, l2] = parsed.lines;
  const checks = [
    verifyCheckDigit(l1.slice(5, 14), l1[14]),
    verifyCheckDigit(l2.slice(0, 6), l2[6]),
    verifyCheckDigit(l2.slice(8, 14), l2[14]),
    verifyCheckDigit(
      l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29),
      l2[29]
    ),
  ];
  return {
    valid: checks.every(Boolean),
    details: {
      documentNumber: checks[0],
      birthDate: checks[1],
      expiryDate: checks[2],
      composite: checks[3],
    },
  };
}

function validateTd3Checks(parsed) {
  const l2 = parsed.lines[1];
  const checks = [
    verifyCheckDigit(l2.slice(0, 9), l2[9]),
    verifyCheckDigit(l2.slice(13, 19), l2[19]),
    verifyCheckDigit(l2.slice(21, 27), l2[27]),
  ];

  if (parsed.personalNumber && parsed.personalNumber.replace(/</g, '').length > 0) {
    checks.push(verifyCheckDigit(parsed.personalNumber, parsed.personalNumberCheck));
  }

  const compositeField =
    l2.slice(0, 10) +
    l2.slice(13, 20) +
    l2.slice(21, 43);
  checks.push(verifyCheckDigit(compositeField, l2[43]));

  return {
    valid: checks.every(Boolean),
    details: {
      documentNumber: checks[0],
      birthDate: checks[1],
      expiryDate: checks[2],
      personalNumber: checks[3] ?? true,
      composite: checks[checks.length - 1],
    },
  };
}

function extractMrzLines(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') return null;

  const compact = cleanMrzLine(ocrText.replace(/[\n\r]/g, ''));
  const lineCandidates = ocrText
    .split(/[\n\r]+/)
    .map(cleanMrzLine)
    .filter(isMrzLike);

  const tryTd1FromLines = (lines) => {
    if (lines.length < 3) return null;
    for (let i = 0; i <= lines.length - 3; i++) {
      const trio = lines.slice(i, i + 3).map(l => padMrzLine(l, 30));
      const header = trio[0];
      if (
        header.startsWith('IDESP') ||
        header.startsWith('I<ESP') ||
        header.startsWith('ID') ||
        header.includes('ESP')
      ) {
        return { format: 'TD1', lines: trio };
      }
    }
    return null;
  };

  const tryTd3FromLines = (lines) => {
    if (lines.length < 2) return null;
    for (let i = 0; i <= lines.length - 2; i++) {
      const pair = lines.slice(i, i + 2).map(l => padMrzLine(l, 44));
      if (pair[0].startsWith('P<') || /^P[A-Z0-9]<[A-Z]{3}/.test(pair[0])) {
        return { format: 'TD3', lines: pair };
      }
    }
    return null;
  };

  const fromCandidates =
    tryTd1FromLines(lineCandidates) ||
    tryTd3FromLines(lineCandidates);
  if (fromCandidates) return fromCandidates;

  const td1Regex = /I[D]?<?ESP[A-Z0-9<]{22,}[0-9][A-Z0-9<]{14,}[0-9][MF<][0-9]{6}[0-9][A-Z]{3}[A-Z0-9<]{11,}[0-9][A-Z]+<<[A-Z<]+/;
  const td1Match = compact.match(td1Regex);
  if (td1Match) {
    const block = td1Match[0];
    if (block.length >= 90) {
      return {
        format: 'TD1',
        lines: [
          block.slice(0, 30),
          block.slice(30, 60),
          block.slice(60, 90),
        ],
      };
    }
  }

  const td3Regex = /P<[A-Z]{3}[A-Z<]{39,}[A-Z0-9<]{43,}/;
  const td3Match = compact.match(td3Regex);
  if (td3Match) {
    const block = td3Match[0];
    if (block.length >= 88) {
      return {
        format: 'TD3',
        lines: [block.slice(0, 44), block.slice(44, 88)],
      };
    }
  }

  return null;
}

function parseUserBirthDateToYymmdd(fecha) {
  if (!fecha) return null;

  const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1].slice(2)}${iso[2]}${iso[3]}`;

  const dmy = fecha.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmy) return `${dmy[3].slice(2)}${dmy[2]}${dmy[1]}`;

  return null;
}

function normalizeDocNumber(value) {
  return (value || '').toUpperCase().replace(/[\.\-\s]/g, '').trim();
}

function mapNationalityCode(nac) {
  const map = {
    españa: 'ESP',
    spain: 'ESP',
    espana: 'ESP',
    española: 'ESP',
    espanola: 'ESP',
  };
  const key = (nac || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return map[key] || (key.length === 3 ? key.toUpperCase() : null);
}

function compareMrzWithUser(parsed, userData, docType) {
  const declaredName = `${userData.apellido || ''} ${userData.nombre || ''}`.trim();
  const mrzName = `${parsed.surname || ''} ${parsed.givenNames || ''}`.trim();

  const nameSim = Math.max(
    tokenSetRatio(declaredName, mrzName),
    partialRatio((userData.apellido || '').toUpperCase(), (parsed.surname || '').toUpperCase()),
    partialRatio((userData.nombre || '').toUpperCase(), (parsed.givenNames || '').toUpperCase())
  );

  const userDob = parseUserBirthDateToYymmdd(userData.fecha);
  const birthDateMatch = userDob ? parsed.birthDate === userDob : null;

  const nationalityCode = mapNationalityCode(userData.nac || userData.pais);
  const nationalityMatch = nationalityCode
    ? parsed.nationality === nationalityCode
    : parsed.nationality === 'ESP';

  let docNumberMatch = null;
  const normalizedDeclared = normalizeDocNumber(userData.ndoc);
  const normalizedMrz = normalizeDocNumber(parsed.documentNumber);

  if (docType === 'Pasaporte' || docType === 'PASAPORTE') {
    docNumberMatch =
      normalizedDeclared.length >= 4 &&
      (normalizedDeclared === normalizedMrz ||
        stringRatio(normalizedDeclared, normalizedMrz) >= 85);
  }

  const isPassport = docType === 'Pasaporte' || docType === 'PASAPORTE';
  const nameMatch = nameSim >= 65;
  const dataMatch = isPassport
    ? nameMatch && birthDateMatch === true && docNumberMatch === true && nationalityMatch
    : nameMatch && birthDateMatch === true && nationalityMatch;

  return {
    nameSim,
    nameMatch,
    birthDateMatch,
    nationalityMatch,
    docNumberMatch,
    dataMatch,
    userDob,
    mrzDob: parsed.birthDate,
    mrzName,
  };
}

function validateMrzFromOcr(ocrText, userData = {}, docType = 'DNI') {
  const extracted = extractMrzLines(ocrText);

  if (!extracted) {
    return {
      found: false,
      format: null,
      checkDigitsValid: false,
      dataMatch: false,
      message: 'No se detectó zona MRZ legible en el OCR.',
      parsed: null,
      comparison: null,
    };
  }

  const parsed =
    extracted.format === 'TD3'
      ? parseTd3(extracted.lines)
      : parseTd1(extracted.lines);

  const checkResult =
    parsed.format === 'TD3'
      ? validateTd3Checks(parsed)
      : validateTd1Checks(parsed);

  const comparison = compareMrzWithUser(parsed, userData, docType);

  let message;
  if (!checkResult.valid) {
    message = 'MRZ detectada pero los dígitos de control ICAO no son válidos (posible manipulación o OCR deficiente).';
  } else if (comparison.dataMatch) {
    message = 'MRZ válida: dígitos de control correctos y datos coherentes con el formulario.';
  } else {
    message = 'MRZ con checksum válido pero discrepancias en nombre, fecha de nacimiento o documento.';
  }

  return {
    found: true,
    format: parsed.format,
    checkDigitsValid: checkResult.valid,
    dataMatch: checkResult.valid && comparison.dataMatch,
    message,
    parsed,
    checkDetails: checkResult.details,
    comparison,
  };
}

function detectMrzInText(ocrText) {
  return Boolean(extractMrzLines(ocrText));
}

module.exports = {
  validateMrzFromOcr,
  detectMrzInText,
  extractMrzLines,
  computeCheckDigit,
  verifyCheckDigit,
};
