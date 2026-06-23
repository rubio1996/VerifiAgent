const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateMrzFromOcr,
  computeCheckDigit,
  verifyCheckDigit,
  extractMrzLines,
} = require('../src/services/mrzService');

function buildValidTd1Mrz() {
  const docNum = 'CAA000000';
  const docCheck = computeCheckDigit(docNum);
  const dob = '800101';
  const dobCheck = computeCheckDigit(dob);
  const exp = '250101';
  const expCheck = computeCheckDigit(exp);
  const l1 = (`IDESP${docNum}${docCheck}`).padEnd(30, '<');
  const l2start = `${dob}${dobCheck}M${exp}${expCheck}ESP`;
  const composite = l1.slice(5, 30) + l2start.slice(0, 7) + l2start.slice(8, 15) + '<<<<<<<<<<<';
  const compCheck = computeCheckDigit(composite);
  const l2 = (l2start + '<<<<<<<<<<<' + compCheck).padEnd(30, '<').slice(0, 30);
  const l3 = 'GARCIA<<JUAN<<<<<<<<<<<<<<<<<<';
  return { ocr: `${l1}\n${l2}\n${l3}`, l1, l2, l3 };
}

describe('mrzService', () => {
  it('calcula dígitos de control ICAO correctamente', () => {
    const check = computeCheckDigit('CAA000000');
    assert.match(check, /^[0-9]$/);
    assert.equal(verifyCheckDigit('CAA000000', check), true);
    assert.equal(verifyCheckDigit('800101', computeCheckDigit('800101')), true);
  });

  it('extrae MRZ TD1 desde texto OCR', () => {
    const { ocr } = buildValidTd1Mrz();
    const extracted = extractMrzLines(ocr);
    assert.ok(extracted);
    assert.equal(extracted.format, 'TD1');
    assert.equal(extracted.lines.length, 3);
  });

  it('valida MRZ TD1 con datos coherentes', () => {
    const { ocr } = buildValidTd1Mrz();
    const result = validateMrzFromOcr(ocr, {
      nombre: 'Juan',
      apellido: 'Garcia',
      fecha: '1980-01-01',
      nac: 'España',
      ndoc: '12345678Z',
      docType: 'DNI',
    }, 'DNI');

    assert.equal(result.found, true);
    assert.equal(result.format, 'TD1');
    assert.equal(result.checkDigitsValid, true);
    assert.equal(result.dataMatch, true);
  });

  it('rechaza MRZ con fecha de nacimiento incorrecta', () => {
    const { ocr } = buildValidTd1Mrz();
    const result = validateMrzFromOcr(ocr, {
      nombre: 'Juan',
      apellido: 'Garcia',
      fecha: '1990-05-15',
      nac: 'España',
      ndoc: '12345678Z',
      docType: 'DNI',
    }, 'DNI');

    assert.equal(result.found, true);
    assert.equal(result.checkDigitsValid, true);
    assert.equal(result.dataMatch, false);
  });

  it('devuelve found=false si no hay MRZ en el texto', () => {
    const result = validateMrzFromOcr('TEXTO SIN ZONA LEGIBLE MRZ', {}, 'DNI');
    assert.equal(result.found, false);
  });
});
