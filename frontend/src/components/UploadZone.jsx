import { useState } from 'react'
import { verifyService } from '../services/api'

const DOC_TYPES = ['DNI', 'NIE', 'Pasaporte', 'Cédula']
const SINGLE_SIDE = ['Pasaporte', 'Cédula']
const LABELS = { front: 'Anverso', back: 'Reverso' }

const selectStyle = {
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--surface-1)',
  color: 'var(--text-h)',
  fontFamily: 'var(--sans)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none',
  flex: 1,
  minWidth: '120px',
  width: '100%',
}

const UploadZone = ({ verificationId, onUploadSuccess }) => {
  const [files, setFiles] = useState({ front: null, back: null })
  const [previews, setPreviews] = useState({ front: null, back: null })
  const [uploaded, setUploaded] = useState({ front: false, back: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [docType, setDocType] = useState('DNI')
  const [side, setSide] = useState('front')

  const isSingleSide = SINGLE_SIDE.includes(docType)
  const sidesNeeded = isSingleSide ? ['front'] : ['front', 'back']
  const currentFile = files[side]
  const currentPreview = previews[side]
  const currentUploaded = uploaded[side]

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFiles(p => ({ ...p, [side]: f }))
      setPreviews(p => ({ ...p, [side]: URL.createObjectURL(f) }))
      setUploaded(p => ({ ...p, [side]: false }))
      setError('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) {
      setFiles(p => ({ ...p, [side]: f }))
      setPreviews(p => ({ ...p, [side]: URL.createObjectURL(f) }))
      setUploaded(p => ({ ...p, [side]: false }))
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!currentFile) return setError(`Selecciona la imagen del ${LABELS[side]} primero`)
    setLoading(true); setError('')
    try {
      const response = await verifyService.uploadDocument(verificationId, files[side], side, docType)
      const newUploaded = { ...uploaded, [side]: true }
      setUploaded(newUploaded)
      const allDone = isSingleSide ? newUploaded.front : (newUploaded.front && newUploaded.back)
      if (allDone) {
        onUploadSuccess(response.data)
      } else {
        setSide(side === 'front' ? 'back' : 'front')
      }
    } catch (err) {
      console.error('Upload error:', err)
      const errData = err.response?.data

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        // Timeout — el backend puede estar procesando igualmente, no bloquear al usuario
        setError('La conexión tardó demasiado. Espera 30 segundos y comprueba tu conexión antes de reintentar.')
      } else if (err.response?.status === 422 && errData?.detectedSide) {
        const detectedLabel = errData.detectedSide === 'front' ? 'ANVERSO' : 'REVERSO'
        const requestedLabel = errData.requestedSide === 'front' ? 'anverso' : 'reverso'
        setError(`⚠️ Cara incorrecta: la imagen parece el ${detectedLabel} pero seleccionaste ${requestedLabel}. Da la vuelta al documento y vuelve a intentarlo.`)
      } else {
        setError(errData?.error || 'Error al procesar el documento.')
      }
    } finally { setLoading(false) }
  }

  const reset = () => {
    if (previews[side]) URL.revokeObjectURL(previews[side])
    setPreviews(p => ({ ...p, [side]: null }))
    setFiles(p => ({ ...p, [side]: null }))
    setUploaded(p => ({ ...p, [side]: false }))
    setError('')
  }

  return (
    <div className="upload-container">
      {/* Header */}
      <div className="sh">
        <div className="sh-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/>
            <path d="M15 8h2M15 12h2M6 16h12"/>
          </svg>
        </div>
        <div>
          <div className="sh-title">Verificación de Identidad</div>
          <div className="sh-sub">Sube las fotos de tu {docType} para continuar.</div>
        </div>
      </div>

      {/* Side progress indicators */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {sidesNeeded.map(s => (
          <div
            key={s} onClick={() => !uploaded[s] && !loading && setSide(s)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: `1px solid ${uploaded[s] ? 'var(--success-border)' : side === s ? 'var(--accent-border)' : 'var(--border)'}`,
              background: uploaded[s] ? 'var(--success-bg)' : side === s ? 'var(--accent-bg)' : 'var(--code-bg)',
              display: 'flex', alignItems: 'center', gap: '6px',
              cursor: uploaded[s] || loading ? 'default' : 'pointer',
              transition: 'all .15s',
            }}
          >
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, background: uploaded[s] ? 'var(--success)' : side === s ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploaded[s]
                ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                : <span style={{ fontSize: '9px', color: 'white', fontWeight: 700 }}>{s === 'front' ? '1' : '2'}</span>
              }
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: uploaded[s] ? '#15803d' : side === s ? 'var(--accent)' : 'var(--text)' }}>
              {LABELS[s]}{uploaded[s] ? ' ✓' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: .6 }}>Tipo de documento</label>
          <select
            value={docType}
            onChange={e => { setDocType(e.target.value); setUploaded({ front: false, back: false }); setSide('front') }}
            style={selectStyle}
            disabled={loading}
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {!isSingleSide && (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: .6 }}>Cara a subir</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['front', 'Anverso'], ['back', 'Reverso']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setSide(val)} disabled={uploaded[val] || loading}
                  style={{
                    flex: 1, padding: '9px', border: `1.5px solid ${uploaded[val] ? 'var(--success-border)' : side === val ? 'var(--accent-border)' : 'var(--border)'}`,
                    borderRadius: '8px', background: uploaded[val] ? 'var(--success-bg)' : side === val ? 'var(--accent-bg)' : 'var(--surface-1)',
                    color: uploaded[val] ? '#15803d' : side === val ? 'var(--accent)' : 'var(--text)',
                    fontSize: '13px', fontWeight: side === val ? 700 : 400,
                    cursor: uploaded[val] || loading ? 'default' : 'pointer', width: 'auto',
                    boxShadow: 'none', transform: 'none',
                  }}
                >
                  {lbl}{uploaded[val] ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      {!currentUploaded ? (
        <label
          htmlFor="file-input"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            display: 'block',
            border: `2px dashed ${dragging ? 'var(--accent)' : currentPreview ? 'var(--accent)' : 'var(--border)'}`,
            borderStyle: currentPreview ? 'solid' : 'dashed',
            borderRadius: '12px',
            padding: currentPreview ? '0' : '40px 20px',
            background: dragging ? 'var(--accent-bg)' : 'var(--code-bg)',
            cursor: loading ? 'not-allowed' : 'pointer',
            textAlign: 'center', transition: 'all .2s',
            marginBottom: '12px', overflow: 'hidden', position: 'relative',
          }}
        >
          {!currentPreview ? (
            <>
              <div style={{ width: '48px', height: '48px', background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                Arrastra o haz clic para subir
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)' }}>
                JPG, PNG — {LABELS[side]} del {docType}
              </p>
            </>
          ) : (
            <div>
              <img src={currentPreview} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', display: 'block', margin: '0 auto' }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {LABELS[side].toUpperCase()} LISTO PARA SUBIR
              </div>
            </div>
          )}
          <input
            id="file-input"
            name="document"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            style={{ position: 'absolute', opacity: 0, inset: 0, cursor: loading ? 'not-allowed' : 'pointer' }}
          />
        </label>
      ) : (
        <div style={{ padding: '20px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: '10px', textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>✅</div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#15803d' }}>{LABELS[side]} subido correctamente</p>
          {!( isSingleSide ? uploaded.front : (uploaded.front && uploaded.back) ) && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text)' }}>
              Ahora sube el {side === 'front' ? 'Reverso' : 'Anverso'} para continuar
            </p>
          )}
        </div>
      )}

      {/* Reset button */}
      {currentPreview && !currentUploaded && !loading && (
        <button type="button" onClick={reset} className="btn-secondary" style={{ fontSize: '12px', marginBottom: '12px' }}>
          Quitar foto del {LABELS[side].toLowerCase()}
        </button>
      )}

      {/* Loading info — aparece mientras el OCR procesa */}
      {loading && (
        <div style={{ padding: '12px 16px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '10px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>Procesando imagen con OCR…</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text)' }}>Puede tardar hasta 40 segundos en móvil. No cierres la pantalla.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: 'var(--danger)', background: 'var(--danger-bg)', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid var(--danger-border)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Upload button */}
      {!currentUploaded && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={!currentFile || loading}
          style={{ background: loading ? '#94a3b8' : 'var(--accent)', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading && (
            <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          )}
          {loading ? `Analizando ${LABELS[side]}... (hasta 40s)` : `Subir ${LABELS[side]}`}
        </button>
      )}
    </div>
  )
}

export default UploadZone