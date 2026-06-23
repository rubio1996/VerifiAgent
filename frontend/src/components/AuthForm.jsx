import { useState, useEffect, useRef } from 'react'
import { authService } from '../services/api'

// ── Animated background canvas ────────────────────────────
const NeuralBackground = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const N = 60
    const nodes = Array.from({ length: N }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r:  Math.random() * 2.5 + 1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      }

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 140) {
            const alpha = (1 - d / 140) * 0.35
            ctx.beginPath()
            ctx.strokeStyle = `rgba(147,197,253,${alpha})`
            ctx.lineWidth = 0.8
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(191,219,254,0.7)'
        ctx.shadowColor = 'rgba(96,165,250,0.8)'
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

// ── Logo ──────────────────────────────────────────────────
const LogoMark = () => (
  <div style={{
    width: '44px', height: '44px',
    background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)',
    borderRadius: '12px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 12px',
    boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
  }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/>
      <path d="M15 8h2M15 12h2M6 16h12"/>
    </svg>
  </div>
)

const GdprBox = () => (
  <div className="gdpr">
    <div className="gdpr-t">Consentimiento GDPR — Art. 7 RGPD</div>
    <ul style={{ paddingLeft: '15px', textAlign: 'left' }}>
      <li>Datos identificativos y contacto.</li>
      <li>Datos biométricos (DNI, NIE, Pasaporte, Cédula).</li>
      <li>Token de sesión JWT (localStorage).</li>
    </ul>
  </div>
)

const Field = ({ label, type = 'text', value, onChange, placeholder, icon, rightSlot }) => (
  <div style={{ marginBottom: '14px', width: '100%' }}>
    <label>{label}</label>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && (
        <span style={{
          position: 'absolute', left: '12px', color: '#64748b',
          display: 'flex', zIndex: 2, pointerEvents: 'none',
        }}>
          {icon}
        </span>
      )}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ paddingLeft: icon ? '38px' : '12px', paddingRight: rightSlot ? '38px' : '12px' }}
      />
      {rightSlot && (
        <span style={{ position: 'absolute', right: '12px', cursor: 'pointer', zIndex: 2, display: 'flex' }}>
          {rightSlot}
        </span>
      )}
    </div>
  </div>
)

// ── Eye toggle (reutilizable) ─────────────────────────────
const EyeToggle = ({ show, onToggle }) => (
  <span
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', cursor: 'pointer',
      color: '#94a3b8', transition: 'color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.color = '#475569'}
    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
  >
    {show
      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
    }
  </span>
)

// ── Forgot Password ───────────────────────────────────────
const ForgotPassword = ({ onBack }) => {
  const [email, setEmail]             = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPwd, setShowNewPwd]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')

  const handleReset = async () => {
    if (!email || !newPassword) { setError('Rellena los dos campos.'); return }
    if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true); setError('')
    try {
      // FIX: normalizar email antes de enviarlo
      await authService.resetPassword(email.toLowerCase().trim(), newPassword)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña.')
    } finally { setLoading(false) }
  }

  // FIX: botón centrado con display block + margin auto
  if (success) return (
    <div className="tc" style={{ padding: '20px 0' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
      <div className="t-h mb8">Contraseña actualizada</div>
      <p className="t-sm mb16">Ya puedes iniciar sesión con tu nueva contraseña.</p>
      <button
        onClick={onBack}
        style={{ display: 'block', margin: '0 auto', width: 'auto', padding: '10px 28px' }}
      >
        Volver al inicio de sesión
      </button>
    </div>
  )

  return (
    <div style={{ width: '100%' }}>
      <div className="tc mb16">
        <LogoMark />
        <div className="t-h">Restablecer contraseña</div>
        <p className="t-s">Introduce tu email y una nueva contraseña.</p>
      </div>
      <div className="card-login mb12" style={{ padding: '16px' }}>
        <Field
          label="Email registrado" type="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
        />
        <Field
          label="Nueva contraseña" type={showNewPwd ? 'text' : 'password'}
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
          rightSlot={<EyeToggle show={showNewPwd} onToggle={() => setShowNewPwd(!showNewPwd)} />}
        />
      </div>
      {error && <div className="error-msg">{error}</div>}
      <button onClick={handleReset} disabled={loading}>
        {loading ? 'Actualizando...' : 'Cambiar contraseña'}
      </button>
      <p className="tc mt12 t-sm">
        <span onClick={onBack} style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
          ← Volver al inicio de sesión
        </span>
      </p>
    </div>
  )
}

// ── Auth tabs ─────────────────────────────────────────────
const AuthTabs = ({ isLogin, onSwitch }) => (
  <div style={{
    display: 'flex', background: 'rgba(241,245,249,0.85)',
    padding: '3px', borderRadius: '10px', marginBottom: '16px',
  }}>
    {[{ label: 'Crear cuenta', val: false }, { label: 'Iniciar sesión', val: true }].map(({ label, val }) => (
      <button
        key={label} type="button" onClick={() => onSwitch(val)}
        style={{
          flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
          background: isLogin === val ? '#fff' : 'transparent',
          color: isLogin === val ? 'var(--accent)' : 'var(--text)',
          fontSize: '12px', fontWeight: 600, width: 'auto',
          boxShadow: isLogin === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          transform: 'none',
        }}
      >
        {label}
      </button>
    ))}
  </div>
)

// ── Login wrapper with neural background ──────────────────
export const LoginBackground = ({ children }) => (
  <div style={{
    position: 'relative', minHeight: '100vh', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #c7d8f0 0%, #dce8f7 25%, #e8f0fb 45%, #d4dcf0 65%, #cdd6ef 80%, #bcc9e8 100%)',
  }}>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: '55%', height: '60%',
        background: 'radial-gradient(ellipse at center, rgba(147,197,253,0.55) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(32px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%', width: '50%', height: '55%',
        background: 'radial-gradient(ellipse at center, rgba(196,181,253,0.4) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '10%', width: '30%', height: '35%',
        background: 'radial-gradient(ellipse at center, rgba(165,214,254,0.45) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(28px)',
      }} />
      <div style={{
        position: 'absolute', top: '15%', left: '10%', width: '80%', height: '60%',
        background: 'radial-gradient(ellipse 70% 40% at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 100%)',
        filter: 'blur(20px)', transform: 'rotate(-12deg)',
      }} />
    </div>
    <NeuralBackground />
    <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '24px' }}>
      {children}
    </div>
  </div>
)

// ── Main AuthForm ─────────────────────────────────────────
const AuthForm = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin]   = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [consent, setConsent]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (isForgot) return (
    <LoginBackground>
      <div className="card-login">
        <ForgotPassword onBack={() => { setIsForgot(false); setIsLogin(true) }} />
      </div>
    </LoginBackground>
  )

  const handleSubmit = async () => {
    if (!isLogin && !consent) { setError('Debes aceptar el tratamiento de datos.'); return }
    setError(''); setLoading(true)
    try {
      // FIX: normalizar email antes de enviarlo al backend
      const normalizedEmail = email.toLowerCase().trim()
      const response = isLogin
        ? await authService.login(normalizedEmail, password)
        : await authService.register(normalizedEmail, password, true)
      localStorage.setItem('verifid_token', response.data.token)
      localStorage.setItem('verifid_email', normalizedEmail)
      onAuthSuccess(response.data.user || { email: normalizedEmail })
    } catch (err) {
      setError(err.response?.data?.error || 'Error en la autenticación.')
    } finally { setLoading(false) }
  }

  return (
    <LoginBackground>
      <div className="tc mb12">
        <LogoMark />
        <div className="t-h">VerifID Agent</div>
      </div>

      <AuthTabs isLogin={isLogin} onSwitch={val => { setIsLogin(val); setError('') }} />

      <div className="card-login mb12">
        <Field
          label="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
        />
        <Field
          label="Contraseña" type={showPwd ? 'text' : 'password'} value={password}
          onChange={e => setPassword(e.target.value)} placeholder="••••••••"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
          rightSlot={<EyeToggle show={showPwd} onToggle={() => setShowPwd(!showPwd)} />}
        />
        {isLogin && (
          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <span
              onClick={() => { setIsForgot(true); setError('') }}
              style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            >
              ¿Olvidaste tu contraseña?
            </span>
          </div>
        )}
      </div>

      {!isLogin && <GdprBox />}
      {!isLogin && (
        <label style={{ display: 'flex', gap: '8px', marginBottom: '16px', cursor: 'pointer', alignItems: 'center' }}>
          <input
            type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
            style={{ width: '14px', height: '14px', accentColor: 'var(--accent)' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text)' }}>Acepto el tratamiento de datos.</span>
        </label>
      )}

      {error && <div className="error-msg">{error}</div>}

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
      </button>

      <p className="tc mt12 t-sm">
        {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
        <span
          onClick={() => { setIsLogin(!isLogin); setError('') }}
          style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
        >
          {isLogin ? 'Regístrate' : 'Entra'}
        </span>
      </p>
    </LoginBackground>
  )
}

export default AuthForm