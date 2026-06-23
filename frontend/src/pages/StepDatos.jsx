import { useState } from 'react'
import { verifyService } from '../services/api'

const Field = ({ label, children }) => (
  <div style={{ marginBottom: '14px' }}>
    <label>{label}</label>
    {children}
  </div>
)

const inputStyle = {
  width: '100%',
  height: '42px',
  padding: '0 12px',
  border: '1.5px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--surface-1)',
  color: 'var(--text-h)',
  fontFamily: 'var(--sans)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  boxSizing: 'border-box',
}

const Input = ({ name, type = 'text', placeholder, onChange, required, value }) => (
  <input
    name={name} type={type} placeholder={placeholder}
    onChange={onChange} required={required} value={value}
    style={inputStyle}
    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-bg)' }}
    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
  />
)

const StepDatos = ({ onStepComplete }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', documentNumber: '',
    birthDate: '', nationality: '',
    email: localStorage.getItem('verifid_email') || '',
    phone: '', country: 'España',
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const response = await verifyService.start(formData)
      onStepComplete(response.data.verificationId)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar la verificación')
    } finally { setLoading(false) }
  }

  return (
    <div>
      {/* Section header */}
      <div className="sh mb16">
        <div className="sh-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div>
          <div className="sh-title">Datos Personales</div>
          <div className="sh-sub">Introduce tus datos tal y como aparecen en tu documento oficial.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb12">

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <Field label="Nombre">
              <Input name="firstName" placeholder="Erick" onChange={handleChange} required />
            </Field>
            <Field label="Apellidos">
              <Input name="lastName" placeholder="García López" onChange={handleChange} required />
            </Field>
          </div>

          <Field label="Número de Documento (DNI / NIE / Pasaporte / Cédula)">
            <Input name="documentNumber" placeholder="13267890D" onChange={handleChange} required />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <Field label="Fecha de Nacimiento">
              <Input name="birthDate" type="date" onChange={handleChange} required />
            </Field>
            <Field label="Nacionalidad">
              <Input name="nationality" placeholder="Tu país" onChange={handleChange} required />
            </Field>
          </div>

          <Field label="Correo electrónico">
            <div style={{ position: 'relative' }}>
              <input
                name="email" type="email" value={formData.email} readOnly
                style={{ ...inputStyle, paddingRight: '36px', background: 'var(--code-bg)', color: 'var(--text)', cursor: 'not-allowed' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            </div>
          </Field>

          <Field label="Teléfono">
            <Input name="phone" type="tel" placeholder="Incluye el código de país: +1, +34, +57..." onChange={handleChange} required />
          </Field>

        </div>

        {/* Info box */}
        <div className="info-box">
          <svg style={{ flexShrink: 0, marginTop: '1px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Estos datos se usarán para contrastarlos con tu documento de identidad en el siguiente paso. Asegúrate de que coincidan exactamente.</span>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Continuar a Documentación →'}
        </button>
      </form>
    </div>
  )
}

export default StepDatos