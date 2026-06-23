const Tesseract = require('tesseract.js');
const sharp = require('sharp');


/**
 * Servicio de extracción de texto mediante OCR (RF-03)
 * @param {Buffer} imageBuffer - El archivo de imagen en memoria enviado desde el controlador
 */
const runOCR = async (imageBuffer) => {
  try {
    // Preprocesamiento agresivo para fotos de móvil en condiciones reales:
    // - rotate():        corrige rotación EXIF automáticamente (foto en vertical/horizontal)
    // - resize(2000):    upscale para que Tesseract tenga más resolución de trabajo
    // - grayscale():     elimina ruido de color y holográficos del DNI
    // - normalise():     estira el histograma de brillo (corrige subexposición/sobreexposición)
    // - linear(1.3,-20): aumenta contraste manualmente para texto sobre fondo claro
    // - sharpen(1.5):    nitidez agresiva para recuperar bordes del texto
    // - median(1):       elimina ruido de píxel suelto (granularidad JPEG de móvil)
    const processedBuffer = await sharp(imageBuffer)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .linear(1.3, -20)
      .sharpen({ sigma: 1.5 })
      .median(1)
      .toBuffer();

    const { data: { text } } = await Tesseract.recognize(
      processedBuffer,
      'spa', // Idioma configurado en español para DNI/NIE
      {
        logger: m => {
          // Solo mostramos el progreso de reconocimiento para no saturar la consola
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progreso: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    return text;
  } catch (error) {
    console.error("Error crítico en el motor OCR:", error);
    // Devolvemos null para que el flujo de verificación no se rompa totalmente
    return null;
  }
};

module.exports = { runOCR };