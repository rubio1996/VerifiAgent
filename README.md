# 🛡️ VerifID Agent

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white"/>
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>
  <img src="https://img.shields.io/badge/Groq-IA-F55036?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/GDPR-Compliant-0072CE?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Railway-Deploy-0B0D0E?style=for-the-badge&logo=railway&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white"/>
</p>

Sistema **KYC (Know Your Customer)** con Inteligencia Artificial orientado a validación documental, análisis de riesgo y generación automatizada de informes.  
Simula la arquitectura utilizada por **fintechs y plataformas RegTech** para procesos de verificación de identidad.

---

## 📌 Estado del Proyecto — Mayo 2026

> ✅ **Proyecto completado.** El sistema ejecuta el flujo KYC completo de extremo a extremo, con frontend responsive, pipeline de verificación funcional y todos los casos de uso validados.

| Módulo | Estado |
|---|---|
| Registro y autenticación con JWT | ✅ Completado |
| Captura de datos personales | ✅ Completado |
| Subida y validación documental | ✅ Completado |
| OCR con Tesseract + detección de cara | ✅ Completado |
| Fuzzy matching de identidad | ✅ Completado |
| Análisis AML / PEP (OpenSanctions) | ✅ Completado |
| Informe narrativo generado con IA (Groq) | ✅ Completado |
| Emisión de PDF dinámico | ✅ Completado |
| Frontend responsive (móvil y escritorio) | ✅ Completado |

---

## ✅ Casos de Uso Validados

| ID | Caso de Uso | Resultado |
|---|---|---|
| CU-01 | Registro y autenticación de usuario | **PASS ✓** — JWT + bcrypt validados |
| CU-02 | Verificación con Pasaporte y DNI (usuario legítimo) | **PASS ✓** — Trust Score 96–99%, APROBADO |
| CU-03 | Bloqueo automático por alerta AML | **PASS ✓** — Flag `amlAlert` activado, RECHAZADO |
| CU-04 | Verificación con Cédula (documento una cara) | **PASS ✓** — Pipeline detecta tipo y activa análisis tras una imagen |
| CU-05 | Rechazo por baja similitud OCR | **PASS ✓** — Trust Score reducido, estado EN REVISIÓN/RECHAZADO |
| CU-06 | Restablecer contraseña en caso de olvido | **PASS ✓** — Contraseña nueva actualizada |

---

## 🔎 Flujo KYC

```
Usuario → Registro/Login → Datos personales → Subida de documento
                                                       ↓
                                               OCR (Tesseract)
                                                       ↓
                                            Detección de cara (front/back)
                                                       ↓
                                            Fuzzy Matching (fuzzball)
                                                       ↓
                                            AML / PEP Check (OpenSanctions)
                                                       ↓
                                            Análisis IA (Groq API)
                                                       ↓
                                               Scoring final
                                                       ↓
                                            Generación PDF (PDFKit)
                                                       ↓
                                     APROBADO / EN REVISIÓN / RECHAZADO
```

---

## 📂 Estructura del Proyecto

```
verifid-agent/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma               # Esquema BD: users, verifications, documents, risk_assessments
│   │
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js       # Registro/Login con bcrypt + JWT
│   │   │   ├── verifyController.js     # Pipeline KYC completo
│   │   │   ├── userController.js       # Gestión de perfil
│   │   │   └── adminController.js      # Panel de administración
│   │   │
│   │   ├── lib/
│   │   │   └── prisma.js               # Cliente Prisma singleton
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js       # Verificación JWT
│   │   │   └── rateLimiter.js          # Rate limiting global
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js                 # POST /api/auth/register, /login
│   │   │   ├── verify.js               # POST /api/verify/start, /document, /result
│   │   │   ├── user.js                 # GET  /api/user/profile
│   │   │   └── admin.js                # GET  /api/admin/verifications
│   │   │
│   │   ├── services/
│   │   │   ├── groqService.js          # Análisis narrativo IA (Groq)
│   │   │   ├── ocrService.js           # Extracción de texto con Tesseract.js
│   │   │   ├── amlService.js           # Consulta AML/PEP a OpenSanctions
│   │   │   └── pdfService.js           # Generación de informes PDF con PDFKit
│   │   │
│   │   └── index.js                    # Servidor Express (puerto 3000)
│   │
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthForm.jsx            # Registro/Login con consentimiento GDPR
│   │   │   └── UploadZone.jsx          # Drag & drop de documentos
│   │   │
│   │   ├── pages/
│       │   ├── StepDatos.jsx           # Formulario de datos personales (Step 1)
│   │   │   └── StepResultado.jsx       # Resultado de la verificación documental (Step 2)
│   │   │
│   │   ├── services/
│   │   │   └── api.js                  # Axios con interceptores JWT
│   │   │
│   │   ├── App.jsx                     # Router de pasos + polling + diseño responsive
│   │   ├── index.css                   # Sistema de diseño global (mobile-first)
│   │   └── main.jsx
│   │
│   ├── vite.config.js
│   ├── package.json
│   └── .env
│
├── .gitignore
└── README.md
```

---

## ⚙️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 18+ |
| Framework API | Express |
| ORM | Prisma + PostgreSQL |
| Base de datos cloud | Supabase |
| Autenticación | JWT + bcryptjs |
| OCR | Tesseract.js |
| Fuzzy Matching | fuzzball |
| IA generativa | Groq API |
| AML/PEP | OpenSanctions API |
| PDF | PDFKit |
| Frontend | React + Vite |
| HTTP Client | Axios |

---

## 🔧 Instalación

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
# → http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🌱 Variables de Entorno

### `backend/.env`

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/verifid
JWT_SECRET=tu_secreto_seguro_minimo_32_caracteres
GROQ_API_KEY=gsk_x...
OPENSANCTIONS_API_KEY=          # Dejar vacío activa el modo simulación
PORT=3000
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:3000
```

---

## 🔐 Seguridad Implementada

- Autenticación JWT con expiración configurable
- Hashing de contraseñas con bcrypt (cost 12)
- Consentimiento GDPR obligatorio con timestamp de auditoría
- Rate limiting global contra abuso de API
- Procesamiento documental en memoria (sin escritura en disco)
- Hash SHA-256 de cada documento procesado
- Proxy seguro para APIs externas (la clave de Anthropic nunca sale al cliente)
- Fallbacks ante errores de red (prioridad seguridad > disponibilidad)
- Detección semántica de cara de documento (front/back) con validación OCR por indicadores

---

## 📱 Diseño Responsive (Mobile-First)

El frontend ha sido diseñado con un enfoque **mobile-first**, garantizando una experiencia fluida tanto en dispositivos móviles como en escritorio.

- Layout adaptativo con breakpoints para móvil (< 480 px), tablet (< 768 px) y escritorio
- Paso de subida documental optimizado para cámara nativa en móvil
- Tipografía, espaciado y botones escalados para pantallas táctiles
- Polling de estado de verificación sin bloqueo de interfaz
- Zona de carga con drag & drop en escritorio y selector de archivo en móvil

---

## 🎯 Objetivo del Proyecto

Construir una arquitectura KYC moderna y modular que pueda evolucionar hacia biometría facial, detección antifraude avanzada, panel administrativo, workflows empresariales y trazabilidad regulatoria completa.

La complejidad principal reside en la **coordinación de múltiples servicios asíncronos** dentro de un pipeline coherente de verificación, replicando los estándares de una plataforma RegTech real.

---

## 👨‍💻 Autor

**Ezel Alexander Duque Arias**  
Proyecto de prácticas enfocado en arquitectura fullstack aplicada a KYC, IA y análisis de riesgo.

---

*VerifID Agent · 2026*
