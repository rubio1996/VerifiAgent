import { useEffect, useState } from 'react'

const PIPELINE_STEPS = [
  { id: 'ocr', label: 'Extracción OCR del documento' },
  { id: 'match', label: 'Contraste de datos personales' },
  { id: 'mrz', label: 'Validación MRZ (zona legible)' },
  { id: 'aml', label: 'Consulta AML / OpenSanctions' },
  { id: 'ai', label: 'Generación de informe IA' },
]

const STATUS_LABELS = {
  PENDING: 'En cola',
  PROCESSING: 'Analizando',
  APPROVED: 'Completado',
  REJECTED: 'Completado',
  REVIEW: 'Completado',
}

/** Avance visual estimado según tiempo (el backend solo devuelve PROCESSING). */
function getActiveStepIndex(elapsedSec, status) {
  if (['APPROVED', 'REJECTED', 'REVIEW'].includes(status)) {
    return PIPELINE_STEPS.length
  }
  if (status === 'PENDING') return 0
  if (elapsedSec < 5) return 0
  if (elapsedSec < 11) return 1
  if (elapsedSec < 19) return 2
  if (elapsedSec < 28) return 3
  return 4
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function StepIcon({ state }) {
  if (state === 'done') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (state === 'active') {
    return (
      <div
        className="a-step-spinner"
        aria-hidden="true"
      />
    )
  }
  return <div className="a-step-dot" aria-hidden="true" />
}

const AnalyzingScreen = ({
  pollingStatus,
  pollError,
  isCompleting,
  startedAt,
}) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [startedAt])

  const activeIdx = getActiveStepIndex(elapsed, pollingStatus)
  const progressPct = isCompleting
    ? 100
    : Math.min(95, Math.round((elapsed / 40) * 100))

  const statusLabel = isCompleting
    ? 'Finalizando informe…'
    : (STATUS_LABELS[pollingStatus] || pollingStatus)

  return (
    <div className="analyzing">
      <div className="analyzing-card card">
        <div className={`analyzing-spinner-wrap${isCompleting ? ' completing' : ''}`}>
          <div className="spinner" />
          {isCompleting && <div className="analyzing-check">✓</div>}
        </div>

        <div className="t-h mb8">
          {isCompleting ? 'Verificación completada' : 'Analizando documentación'}
        </div>
        <div className="t-sm analyzing-sub">
          {isCompleting
            ? 'Preparando tu resultado…'
            : 'Suele tardar entre 20 y 40 segundos. No cierres esta pantalla.'}
        </div>

        <div className="analyzing-progress-wrap">
          <div className="analyzing-progress-meta">
            <span>Progreso estimado</span>
            <span>{progressPct}%</span>
          </div>
          <div className="analyzing-progress-track">
            <div
              className="analyzing-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="analyzing-progress-meta analyzing-elapsed">
            <span>Tiempo transcurrido: {formatElapsed(elapsed)}</span>
            <span className="analyzing-status-badge">{statusLabel}</span>
          </div>
        </div>

        <div className="a-steps" role="list" aria-label="Etapas del análisis KYC">
          {PIPELINE_STEPS.map((step, i) => {
            let state = 'pend'
            if (isCompleting || i < activeIdx) state = 'done'
            else if (i === activeIdx) state = 'active'

            return (
              <div key={step.id} className={`a-step ${state}`} role="listitem">
                <StepIcon state={state} />
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>

        {pollError && (
          <div className="analyzing-poll-warn" role="status">
            ⚠️ {pollError}
          </div>
        )}

        <p className="analyzing-footnote">
          Actualización automática cada 3 segundos
        </p>
      </div>
    </div>
  )
}

export default AnalyzingScreen
