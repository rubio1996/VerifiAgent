const fetch = globalThis.fetch || require('node-fetch');

// ─────────────────────────────────────────────────────────────────────────────
// LISTA NEGRA LOCAL
// Red de seguridad cuando OpenSanctions no devuelve resultados o falla.
// ─────────────────────────────────────────────────────────────────────────────
const LISTA_NEGRA = [
  {
    keywords: ['PABLO ESCOBAR', 'ESCOBAR GAVIRIA', 'PABLO EMILIO ESCOBAR'],
    entity:   'Pablo Emilio Escobar Gaviria',
    level:    'HIGH',
    reason:   'Narcotraficante internacional. Cártel de Medellín.',
  },
  {
    keywords: ['BIN LADEN', 'OSAMA BIN LADEN', 'USAMA BIN LADIN'],
    entity:   'Osama Bin Laden',
    level:    'HIGH',
    reason:   'Terrorismo internacional. Lista OFAC / ONU.',
  },
  {
    keywords: ['KADHAFI', 'GADDAFI', 'MUAMMAR GADDAFI', 'MUAMMAR AL-GADDAFI'],
    entity:   'Muammar Gaddafi',
    level:    'HIGH',
    reason:   'Dirigente sancionado. Lista ONU / UE.',
  },
  {
    keywords: ['NICOLAS MADURO', 'MADURO MOROS', 'NICOLÁS MADURO'],
    entity:   'Nicolás Maduro Moros',
    level:    'HIGH',
    reason:   'Sanciones OFAC. Gobierno Venezuela.',
  },
  {
    keywords: ['AL-BAGHDADI', 'ABU BAKR AL-BAGHDADI', 'ABU BAKR ALBAGHDADI'],
    entity:   'Abu Bakr al-Baghdadi',
    level:    'HIGH',
    reason:   'Terrorismo. ISIS/DAESH. Lista ONU.',
  },
  {
    keywords: ['KIM JONG UN', 'KIM JONGUN', 'KIM JONG-UN'],
    entity:   'Kim Jong-un',
    level:    'HIGH',
    reason:   'Sanciones internacionales. RPDC.',
  },
  {
    keywords: ['VLADIMIR PUTIN', 'PUTIN VLADIMIR'],
    entity:   'Vladimir Putin',
    level:    'HIGH',
    reason:   'Sanciones UE / OFAC desde 2022.',
  },
  {
    keywords: ['DAWOOD IBRAHIM', 'DAUD IBRAHIM', 'DAWOOD IBRAHIM KASKAR', 'DAUD IBRAHIM MEMON'],
    entity:   'Dawood Ibrahim Kaskar',
    level:    'HIGH',
    reason:   'Terrorismo internacional. Lista OFAC / ONU / Interpol.',
  },
  {
    keywords: ['TEST FRAUD', 'FRAUD TEST'],
    entity:   'Test Fraud Entity',
    level:    'MEDIUM',
    reason:   'Entidad de prueba para validación del sistema AML.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Normaliza un nombre: elimina tildes, caracteres especiales, mayúsculas
// ─────────────────────────────────────────────────────────────────────────────
function normalizarNombre(nombre) {
  return (nombre || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Comprueba el nombre contra la lista negra local
// ─────────────────────────────────────────────────────────────────────────────
function checkListaNegra(nombreNormalizado) {
  const match = LISTA_NEGRA.find(entry =>
    entry.keywords.some(kw => nombreNormalizado.includes(normalizarNombre(kw)))
  );

  if (match) {
    return {
      isAlert:       true,
      level:         match.level,
      message:       `ALERTA AML: El sujeto "${nombreNormalizado}" coincide con la entidad sancionada "${match.entity}". ${match.reason} Figura en listas de vigilancia de alto riesgo internacional.`,
      matchedEntity: match.entity,
      source:        'LOCAL_BLACKLIST',
    };
  }

  return null;
}

function resultadoLimpio(sufijo = '') {
  return {
    isAlert:       false,
    level:         'NONE',
    message:       `LIMPIO: No se encontraron coincidencias en listas de sanciones internacionales.${sufijo}`,
    matchedEntity: null,
    source:        'OPENSANCTIONS',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// checkAML — función principal exportada
//
// Usa el endpoint /match/ de OpenSanctions, diseñado para KYC.
// Es mucho más preciso que /search/ porque compara entidades estructuradas,
// no texto libre. Maneja variantes de nombre, transliteraciones y alias.
//
// Flujo:
//   1. Sin API key → lista local únicamente (modo simulación)
//   2. Con API key → /match/ de OpenSanctions
//      a. score ≥ 0.7  → ALERTA fuerte (coincidencia directa)
//      b. score ≥ 0.5  → ALERTA moderada (posible coincidencia)
//      c. score < 0.5  → fallback lista local
//      d. Error técnico → fallback lista local
// ─────────────────────────────────────────────────────────────────────────────
async function checkAML(nombreCompleto, userData = {}) {
  const apiKey      = process.env.OPENSANCTIONS_API_KEY;
  const nombreQuery = (nombreCompleto || '').trim();
  const nombreNorm  = normalizarNombre(nombreQuery);

  if (!nombreQuery) {
    console.warn('[AML SERVICE] Nombre vacío recibido.');
    return resultadoLimpio(' (Nombre no proporcionado)');
  }

  // ── MODO SIMULACIÓN ────────────────────────────────────────────────────────
  if (!apiKey || apiKey === 'tu_key_aqui' || apiKey.trim() === '') {
    console.warn(`[AML SERVICE] ⚠️  Modo Simulación. Comprobando lista local para: ${nombreNorm}`);
    const matchLocal = checkListaNegra(nombreNorm);
    if (matchLocal) {
      console.warn(`[AML SERVICE] 🚨 ALERTA LOCAL: ${matchLocal.matchedEntity}`);
      return { ...matchLocal, source: 'LOCAL_BLACKLIST_SIM' };
    }
    return { ...resultadoLimpio(' (Simulado — sin API key)'), source: 'LOCAL_BLACKLIST_SIM' };
  }

  // ── CONSULTA REAL — endpoint /match/ ──────────────────────────────────────
  // El endpoint /match/ acepta un objeto de entidad estructurado.
  // Esto permite que OpenSanctions compare contra todos los alias conocidos
  // de cada entidad sancionada, incluyendo transliteraciones.
  try {
    const url = 'https://api.opensanctions.org/match/default?algorithm=regression-v1&threshold=0.5';

    // Construimos la query con todos los datos disponibles del usuario.
    // Cuantos más datos enviemos, más preciso es el match.
    const queryEntity = {
      schema: 'Person',
      properties: {
        name: [nombreQuery],
        ...(userData.fecha       ? { birthDate:    [userData.fecha] }  : {}),
        ...(userData.nac         ? { nationality:  [userData.nac] }    : {}),
        ...(userData.ndoc        ? { idNumber:      [userData.ndoc] }  : {}),
      }
    };

    console.log(`[AML SERVICE] Consultando OpenSanctions /match/ para: "${nombreQuery}"`);
    console.log(`[AML SERVICE] Query entity:`, JSON.stringify(queryEntity, null, 2));

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        queries: {
          q1: queryEntity
        }
      }),
      signal: AbortSignal.timeout(15000),
    });

    // ── Plan trial agotado ────────────────────────────────────────────────────
    if (response.status === 402) {
      console.warn('[AML SERVICE] Límite trial (402). Usando lista local.');
      const matchLocal = checkListaNegra(nombreNorm);
      if (matchLocal) {
        return {
          ...matchLocal,
          message: matchLocal.message + ' (Verificado por lista local — trial API agotado)',
          source:  'LOCAL_BLACKLIST_FALLBACK',
        };
      }
      return {
        isAlert:       false,
        level:         'NONE',
        message:       'REVISIÓN MANUAL REQUERIDA: Límite del plan trial alcanzado.',
        matchedEntity: null,
        source:        'MANUAL_REVIEW',
      };
    }

    if (!response.ok) {
      throw new Error(`OpenSanctions respondió con status HTTP ${response.status}`);
    }

    const data      = await response.json();
    const resultados = data.responses?.q1?.results || [];
    const total      = resultados.length;

    console.log(`[AML DEBUG] /match/ resultados recibidos: ${total}`);

    if (total > 0) {
      resultados.forEach((r, i) => {
        console.log(`[AML DEBUG] Resultado ${i + 1}: ${r.caption} — score: ${r.score} — datasets: ${r.datasets?.join(',')}`);
      });

      // El endpoint /match/ ya filtra por threshold=0.5 en la URL,
      // pero comprobamos igualmente por seguridad.
      // Score ≥ 0.7 = coincidencia fuerte, ≥ 0.5 = coincidencia moderada.
      const amenaza = resultados.find(r => r.score >= 0.5);

      if (amenaza) {
        const datasets = amenaza.datasets?.join(', ')           || 'listas internacionales';
        const topics   = amenaza.properties?.topics?.join(', ') || 'entidad de alto riesgo';
        const paises   = amenaza.properties?.country?.join(', ')|| 'desconocido';
        const nivel    = amenaza.score >= 0.7 ? 'COINCIDENCIA DIRECTA' : 'POSIBLE COINCIDENCIA';

        const msg = [
          `ALERTA AML [${nivel}]: Coincidencia con "${amenaza.caption}"`,
          `(Score: ${Math.round(amenaza.score * 100)}%).`,
          `Clasificación de riesgo: ${topics}.`,
          `País asociado: ${paises}.`,
          `Fuente de datos: ${datasets}.`,
        ].join(' ');

        console.warn(`[AML SERVICE] 🚨 ALERTA /match/: ${amenaza.caption} — Score: ${amenaza.score}`);
        return {
          isAlert:       true,
          level:         'HIGH',
          message:       msg,
          matchedEntity: amenaza.caption,
          source:        'OPENSANCTIONS_MATCH',
        };
      }
    }

    // ── Sin coincidencias → fallback lista local ──────────────────────────────
    console.log('[AML SERVICE] Sin coincidencias en /match/. Comprobando lista local...');
    const matchLocal = checkListaNegra(nombreNorm);
    if (matchLocal) {
      console.warn(`[AML SERVICE] 🚨 ALERTA LOCAL (fallback): ${matchLocal.matchedEntity}`);
      return {
        ...matchLocal,
        message: matchLocal.message + ' (Detectado por lista de seguridad local)',
        source:  'LOCAL_BLACKLIST_FALLBACK',
      };
    }

    console.log(`[AML SERVICE] ✅ LIMPIO: ${nombreNorm}`);
    return resultadoLimpio();

  } catch (error) {
    console.error('[AML SERVICE] Error en consulta /match/:', error.message);

    const matchLocal = checkListaNegra(nombreNorm);
    if (matchLocal) {
      console.warn(`[AML SERVICE] 🚨 Error técnico pero coincidencia local: ${matchLocal.matchedEntity}`);
      return {
        ...matchLocal,
        message: matchLocal.message + ' (Error técnico en API — detectado por lista local)',
        source:  'LOCAL_BLACKLIST_ERROR',
      };
    }

    return {
      isAlert:       false,
      level:         'NONE',
      message:       `REVISIÓN MANUAL REQUERIDA: No se pudo conectar con el servicio de sanciones. Error: ${error.message}`,
      matchedEntity: null,
      source:        'ERROR_TECHNICAL',
    };
  }
}

module.exports = { checkAML };