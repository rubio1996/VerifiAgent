const logger = console;

exports.verify = async (req, res) => {
  try {
    const { match, distance } = req.body;
    logger.log('[BIOMETRICS] Recebido resultado:', { match, distance });

    // PoC: no persistimos en DB, solo devolvemos el resultado
    return res.status(200).json({ ok: true, match, distance });
  } catch (error) {
    logger.error('[BIOMETRICS] Error procesando:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
