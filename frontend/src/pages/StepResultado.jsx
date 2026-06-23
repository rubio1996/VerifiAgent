import { useState } from 'react'
import { verifyService } from '../services/api'

const statusConfig = {
  APPROVED: {
    icon:   '✅',
    label:  'Verificación aprobada',
    color:  '#15803d',
    bg:     'rgba(34,197,94,0.08)',
    border: 'var(--success)',
  },
  REJECTED: {
    icon:   '❌',
    label:  'Verificación rechazada',
    color:  '#dc2626',
    bg:     'rgba(239,68,68,0.08)',
    border: '#f87171',
  },
  REVIEW: {
    icon:   '⏳',
    label:  'Revisión manual requerida',
    color:  '#d97706',
    bg:     'rgba(245,158,11,0.08)',
    border: '#fbbf24',
  },
}

// ─── Barra de puntuación ──────────────────────────────────────────────────────
const ScoreBar = ({ label, value, color }) => (
  <div style={{ marginBottom: '14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color }}>{value}%</span>
    </div>
    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
    </div>
  </div>
)

// ─── Banner de alerta AML ─────────────────────────────────────────────────────
const AMLAlertBanner = ({ matchedEntity }) => (
  <div style={{
    padding:      '16px 18px',
    background:   'rgba(220,38,38,0.08)',
    border:       '1.5px solid #dc2626',
    borderLeft:   '6px solid #dc2626',
    borderRadius: '10px',
    marginBottom: '12px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{ fontSize: '22px', lineHeight: 1 }}>🚨</span>
      <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '14px', letterSpacing: '0.02em' }}>
        ALERTA AML — SUJETO SANCIONADO DETECTADO
      </span>
    </div>
    {matchedEntity && (
      <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600, marginBottom: '8px' }}>
        Entidad identificada: <span style={{ fontStyle: 'italic' }}>{matchedEntity}</span>
      </div>
    )}
    <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d', lineHeight: 1.7 }}>
      Este sujeto ha sido identificado en listas de sanciones internacionales. La verificación
      ha sido <strong>bloqueada automáticamente</strong>. Este caso requiere notificación a las
      autoridades competentes y no puede ser aprobado bajo ninguna circunstancia.
    </p>
  </div>
)

// ─── Componente principal ─────────────────────────────────────────────────────
const StepResultado = ({ result, onFinish }) => {
  const [downloading, setDownloading] = useState(false)

  const status     = statusConfig[result.status] || statusConfig.REVIEW
  const trustColor = result.trustScore >= 80 ? '#15803d' : result.trustScore >= 50 ? '#d97706' : '#dc2626'

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      await verifyService.downloadReport(result.id)
    } catch (err) {
      console.error('Error descargando PDF:', err)
      alert('No se pudo descargar el informe. Inténtalo de nuevo.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ width: '36px', height: '36px', background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>Resultado de la Verificación</h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)' }}>ID: {result.id?.slice(0, 8)}...</p>
        </div>
      </div>

      {/* ── Banner AML (solo si hay alerta) ────────────────────────────────── */}
      {result.amlAlert && (
        <AMLAlertBanner matchedEntity={result.matchedEntity || null} />
      )}

      {/* ── Estado principal ────────────────────────────────────────────────── */}
      <div style={{ padding: '20px', background: status.bg, border: `1px solid ${status.border}`, borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{status.icon}</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: status.color }}>{status.label}</div>
        {result.amlAlert && (
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginTop: '6px' }}>
            Motivo: coincidencia en listas de sanciones internacionales (AML)
          </div>
        )}
        {result.completedAt && (
          <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '6px' }}>
            Completado: {new Date(result.completedAt).toLocaleString('es-ES')}
          </div>
        )}
      </div>

      {/* ── Scores ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Puntuaciones
        </div>

        <ScoreBar label="Confianza global (Trust Score)"  value={result.trustScore  ?? 0} color={trustColor} />
        <ScoreBar label="Autenticidad documental"         value={result.docScore    ?? 0} color="#1d4ed8" />
        <ScoreBar
          label="Riesgo de fraude"
          value={result.fraudScore ?? 0}
          color={result.fraudScore <= 20 ? '#15803d' : result.fraudScore <= 50 ? '#d97706' : '#dc2626'}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: result.ocrMatch ? 'var(--success)' : '#f87171', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
            OCR Match: <strong style={{ color: result.ocrMatch ? '#15803d' : '#dc2626' }}>
              {result.ocrMatch ? 'Datos coinciden con el documento' : 'No se pudo confirmar la coincidencia'}
            </strong>
          </span>
        </div>

        {result.mrzValid != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: result.mrzMatch ? 'var(--success)' : (result.mrzValid ? '#fbbf24' : '#f87171'), flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>
              Validación MRZ: <strong style={{ color: result.mrzMatch ? '#15803d' : (result.mrzValid ? '#d97706' : '#dc2626') }}>
                {result.mrzMatch
                  ? 'Zona MRZ válida y coherente'
                  : (result.mrzValid
                    ? 'MRZ legible con discrepancias'
                    : 'Dígitos de control MRZ inválidos')}
              </strong>
            </span>
          </div>
        )}
        {result.mrzMessage && (
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text)', lineHeight: 1.5 }}>
            {result.mrzMessage}
          </p>
        )}
      </div>

      {/* ── AML / Sanciones ────────────────────────────────────────────────── */}
      {result.amlResult && (
        <div className="card" style={{ marginBottom: '12px', borderLeft: result.amlAlert ? '4px solid #dc2626' : undefined }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: result.amlAlert ? '#dc2626' : 'var(--text-h)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Verificación AML / Sanciones
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
            {result.amlResult}
          </p>
        </div>
      )}

      {/* ── Informe IA ──────────────────────────────────────────────────────── */}
      {result.aiReport && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Informe Narrativo de IA
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>
            {result.aiReport}
          </p>
        </div>
      )}

      {/* ── Acciones ────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleDownloadPDF}
        disabled={downloading}
        style={{ width: '100%', padding: '13px', background: result.amlAlert ? '#dc2626' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', transition: 'opacity 0.2s' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        {downloading ? 'Generando informe...' : 'Descargar informe PDF'}
      </button>

      <button type="button" onClick={onFinish} className="btn-secondary" style={{ width: '100%' }}>
        Finalizar sesión
      </button>

    </div>
  )
}

export default StepResultado