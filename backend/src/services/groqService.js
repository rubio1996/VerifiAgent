const fetch = require('node-fetch');

/**
 * Genera un informe KYC local cuando Groq no está disponible.
 */
function generateLocalReport(userData, scores, amlResult) {
  const nombre = `${userData.nombre} ${userData.apellido}`;
  const { docScore, fraudScore, trustScore, result } = scores;
  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  if (result === 'aml_flagged') {
    return `ALERTA CRÍTICA DE SEGURIDAD — Informe KYC emitido el ${fecha}. ` +
      `El sujeto identificado como ${nombre} ha sido detectado en listas de vigilancia de sanciones internacionales con alta peligrosidad. ` +
      `Entidad coincidente: ${amlResult.matchedEntity || 'Sujeto sancionado internacional'}. ` +
      `El sistema KYC ha bloqueado automáticamente esta verificación. ` +
      `Se requiere notificación inmediata al departamento de cumplimiento y a las autoridades competentes. ` +
      `DECISIÓN FINAL: SOLICITUD RECHAZADA — SUJETO DE ALTA PELIGROSIDAD.`;
  }

  if (result === 'approved') {
    return `Informe de verificación KYC emitido el ${fecha}. ` +
      `El proceso de identificación del sujeto ${nombre} ha concluido satisfactoriamente. ` +
      `La autenticidad documental ha sido evaluada con una puntuación de ${docScore}%, ` +
      `el índice de riesgo de fraude se sitúa en ${fraudScore}% y la confianza global del sistema alcanza el ${trustScore}%. ` +
      `Resultado AML: ${amlResult.message}. ` +
      `En base a los indicadores analizados, se recomienda la APROBACIÓN de la solicitud sin necesidad de revisión adicional.`;
  }

  if (result === 'review') {
    return `Informe de verificación KYC emitido el ${fecha}. ` +
      `El análisis del sujeto ${nombre} ha generado incertidumbre en alguno de los parámetros evaluados. ` +
      `La confianza global es del ${trustScore}%, por debajo del umbral de aprobación automática. ` +
      `Resultado AML: ${amlResult.message}. ` +
      `Se recomienda REVISIÓN MANUAL por parte de un agente de cumplimiento antes de tomar una decisión definitiva.`;
  }

  return `Informe de verificación KYC emitido el ${fecha}. ` +
    `El proceso de verificación ha concluido con resultado RECHAZADO. ` +
    `La confianza global del sistema es del ${trustScore}% y el índice de riesgo de fraude es del ${fraudScore}%. ` +
    `Resultado AML: ${amlResult.message}. ` +
    `Los indicadores de riesgo detectados no permiten validar la identidad del solicitante de forma automática.`;
}

/**
 * Construye el prompt según el resultado de la verificación.
 */
function buildPrompt(userData, scores, amlResult) {
  const { nombreCompleto = `${userData.nombre} ${userData.apellido}`, ndoc, docType, nac } = userData;
  const { docScore, fraudScore, trustScore, result } = scores;

  if (result === 'aml_flagged') {
    return `Eres un agente KYC y oficial de cumplimiento (compliance officer) experto.
Se ha detectado una coincidencia AML CRÍTICA para el siguiente sujeto:
- Nombre: ${nombreCompleto}
- Coincidencia detectada: ${amlResult.matchedEntity || 'Entidad en lista de sanciones'}
- Detalle AML: ${amlResult.message}
- Puntuación de Riesgo de Fraude: ${fraudScore}%
- Confianza Global: ${trustScore}%

Emite un informe de RECHAZO INMEDIATO en español. El informe debe:
1. Declarar que el sujeto figura en listas de vigilancia internacionales y representa una amenaza de alta peligrosidad.
2. Indicar que la verificación ha sido bloqueada automáticamente por el sistema AML.
3. Recomendar notificación inmediata a las autoridades y al departamento de cumplimiento.
Sé conciso (4-5 frases), formal y sin markdown.`;
  }

  if (result === 'approved') {
    return `Eres un agente KYC profesional. Emite un informe de verificación APROBADO en español para:
- Nombre: ${nombreCompleto}
- Nacionalidad: ${nac}
- Documento: ${docType} ${ndoc}
- Autenticidad documental: ${docScore}%
- Riesgo de fraude: ${fraudScore}%
- Confianza global: ${trustScore}%
- Resultado AML/PEP: ${amlResult.message}
El informe debe ser conciso (3-4 frases), profesional y sin markdown.`;
  }

  if (result === 'review') {
    return `Eres un agente KYC profesional. Emite un informe de REVISIÓN MANUAL en español para:
- Nombre: ${nombreCompleto}
- Autenticidad: ${docScore}%, Fraude: ${fraudScore}%, Confianza: ${trustScore}%
- AML/PEP: ${amlResult.message}
Señala los factores que generan incertidumbre y recomienda los pasos de revisión manual. Sin markdown.`;
  }

  return `Eres un agente KYC profesional. Emite un informe de RECHAZO en español.
- Confianza: ${trustScore}%, Riesgo: ${fraudScore}%
- AML/PEP: ${amlResult.message}
No menciones el nombre del usuario. Indica los indicadores de riesgo detectados. Sin markdown.`;
}

/**
 * Genera el informe narrativo KYC usando Groq (llama-3.3-70b-versatile).
 * Si Groq no está disponible, genera el informe localmente como fallback.
 */
async function callGroq(userData, scores, amlResult) {
  const groqKey = process.env.GROQ_API_KEY;
  const prompt = buildPrompt(userData, scores, amlResult);

  if (!groqKey || groqKey === 'tu_key_aqui' || groqKey === '') {
    console.warn('[GROQ] Sin API key — usando informe local.');
    return generateLocalReport(userData, scores, amlResult);
  }

  try {
    console.log('[GROQ] Generando informe con llama-3.3-70b-versatile...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Groq error ${response.status}: ${err.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    console.log('[GROQ] Informe generado correctamente ✓');
    return data.choices[0].message.content;

  } catch (err) {
    console.warn('[GROQ] API no disponible, usando informe local:', err.message);
    return generateLocalReport(userData, scores, amlResult);
  }
}

module.exports = { callGroq };