import { useState, useEffect } from 'react'
import './index.css'
import AuthForm from './components/AuthForm'
import StepDatos from './pages/StepDatos'
import UploadZone from './components/UploadZone'
import StepResultado from './pages/StepResultado'
import AnalyzingScreen from './components/AnalyzingScreen'
import { verifyService } from './services/api'

// ── Dark mode ─────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('verifid_theme') === 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('verifid_theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, () => setDark(d => !d)]
}

// ── Progress bar — estilo original ────────────────────────
function ProgressStrip({ currentStep, finalResult }) {
  const steps = ['Datos', 'Documento', 'Análisis', 'Resultado']
  const active = finalResult ? 4 : currentStep // 1-based

  return (
    <div style={{
      width: '100%',
      background: '#f4f3ec',
      borderBottom: '1px solid var(--border)',
      padding: '8px 1rem',
    }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {steps.map((label, i) => {
          const idx = i + 1
          const done   = active > idx
          const isActive = active === idx
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: done ? 'var(--success)' : isActive ? 'var(--accent)' : '#e2e8f0',
                color: '#fff', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 0 3px rgba(29,78,216,0.15)' : 'none',
                flexShrink: 0,
              }}>
                {done ? '✓' : idx}
              </div>
              <span className="progress-label" style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: done ? '#15803d' : isActive ? 'var(--accent)' : '#64748b',
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────
function readStoredSession() {
  const token = localStorage.getItem('verifid_token')
  const email = localStorage.getItem('verifid_email')
  if (token && email) return { user: { email }, step: 1 }
  return { user: null, step: 0 }
}

function App() {
  const [user, setUser] = useState(() => readStoredSession().user)
  const [currentStep, setCurrentStep] = useState(() => readStoredSession().step)
  const [verificationId, setVerificationId] = useState(null)
  const [finalResult, setFinalResult] = useState(null)
  const [pollingStatus, setPollingStatus] = useState('PROCESSING')
  const [pollError, setPollError] = useState(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [analysisStartedAt, setAnalysisStartedAt] = useState(null)
  const [dark, toggleDark] = useDarkMode()

  useEffect(() => {
    const handleExpire = () => { localStorage.clear(); setUser(null); setCurrentStep(0) }
    window.addEventListener('verifid:session-expired', handleExpire)
    return () => window.removeEventListener('verifid:session-expired', handleExpire)
  }, [])

  useEffect(() => {
    if (currentStep !== 3 || !verificationId || finalResult) return undefined

    let cancelled = false
    let interval

    const poll = async () => {
      try {
        const { data } = await verifyService.getStatus(verificationId)
        if (cancelled) return

        setPollError(null)
        setPollingStatus(data.status)

        if (['APPROVED', 'REJECTED', 'REVIEW'].includes(data.status)) {
          clearInterval(interval)
          setIsCompleting(true)
          const resultRes = await verifyService.getResult(verificationId)
          if (!cancelled) {
            setTimeout(() => {
              setFinalResult({ ...resultRes.data, id: verificationId })
            }, 700)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Polling error:', err)
          setPollError('Conexión interrumpida. Reintentando en unos segundos…')
        }
      }
    }

    poll()
    interval = setInterval(poll, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentStep, verificationId, finalResult])

  const handleLogout = () => { localStorage.clear(); window.location.reload() }

  const showNav = currentStep > 0

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Topbar — mismo alto y estilo que el diseño original ── */}
      {showNav && (
        <header style={{
          width: '100%',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          padding: '0 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '52px',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 12px rgba(29,78,216,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="9" cy="10" r="2"/>
                <path d="M15 8h2M15 12h2M6 16h12"/>
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
              VerifID Agent
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user && (
              <button
                onClick={handleLogout}
                style={{ width: 'auto', padding: '5px 12px', fontSize: '11px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', boxShadow: 'none', color: '#fff' }}
              >
                Salir
              </button>
            )}
            <button
              onClick={toggleDark}
              style={{ width: 'auto', padding: '6px 10px', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '16px', lineHeight: 1, cursor: 'pointer', boxShadow: 'none' }}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>
      )}

      {/* ── Barra de progreso — estilo original ── */}
      {showNav && (
        <ProgressStrip currentStep={currentStep} finalResult={finalResult} />
      )}

      {/* ── Contenido ── */}
      {currentStep === 0 ? (
        <AuthForm onAuthSuccess={(userData) => { setUser(userData); setCurrentStep(1) }} />
      ) : null}

      <main style={{
        flex: 1, width: '100%', maxWidth: '560px', margin: '0 auto',
        display: currentStep === 0 ? 'none' : 'flex',
        flexDirection: 'column', justifyContent: 'flex-start',
        padding: 'clamp(12px, 4vw, 20px)', boxSizing: 'border-box',
      }}>

        {/* Paso 1: Datos personales */}
        {currentStep === 1 && (
          <StepDatos onStepComplete={(id) => { setVerificationId(id); setCurrentStep(2) }} />
        )}

        {/* Paso 2: Subida de documento */}
        {currentStep === 2 && (
          <div className="card">
            <h2 style={{ color: 'var(--text-h)', margin: '0 0 8px', fontSize: '16px' }}>Paso 2: Documento</h2>
            <UploadZone
              verificationId={verificationId}
              onUploadSuccess={() => {
                setAnalysisStartedAt(Date.now())
                setPollingStatus('PROCESSING')
                setPollError(null)
                setIsCompleting(false)
                setCurrentStep(3)
              }}
            />
          </div>
        )}

        {/* Paso 3: Análisis en curso */}
        {currentStep === 3 && !finalResult && analysisStartedAt && (
          <AnalyzingScreen
            pollingStatus={pollingStatus}
            pollError={pollError}
            isCompleting={isCompleting}
            startedAt={analysisStartedAt}
          />
        )}

        {/* Paso 4: Resultado final */}
        {finalResult && (
          <StepResultado result={finalResult} onFinish={handleLogout} />
        )}

      </main>
    </div>
  )
}

export default App