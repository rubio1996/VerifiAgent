# Variables de entorno para GitHub Actions (Settings → Secrets and variables → Actions)

## Secrets (obligatorios para CD)

| Secret | Descripción | Dónde obtenerlo |
|--------|-------------|-----------------|
| `VERCEL_TOKEN` | Token de despliegue Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ID de la organización/equipo | `vercel link` → `.vercel/project.json` o dashboard |
| `VERCEL_PROJECT_ID` | ID del proyecto frontend | `.vercel/project.json` tras `vercel link` en `frontend/` |
| `RAILWAY_TOKEN` | Token de API Railway | Railway → Account Settings → Tokens |
| `RAILWAY_PROJECT_ID` | ID del proyecto backend | Railway → Project → Settings |

## Variables (opcionales)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend en producción (build frontend) | `https://verifid-api.up.railway.app/api` |
| `RAILWAY_SERVICE` | Nombre del servicio en Railway (si hay varios) | `verifid-backend` |

## Environments recomendados

Crear en GitHub → Settings → Environments:

- `production-frontend` — despliegue Vercel
- `production-backend` — despliegue Railway

## Flujos

- **CI** (`.github/workflows/ci.yml`): push/PR a `main`, `master`, `develop`
- **CD** (`.github/workflows/cd.yml`): push a `main`/`master` o ejecución manual (`workflow_dispatch`)

El CD ejecuta primero el CI completo como gate antes de desplegar.
