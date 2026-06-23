#!/usr/bin/env node
/**
 * Simula localmente el pipeline CI de GitHub Actions.
 * Uso: node scripts/run-ci.js
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');

const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://ci:ci@localhost:5432/verifid_ci',
  DIRECT_URL: 'postgresql://ci:ci@localhost:5432/verifid_ci',
  JWT_SECRET: 'ci-test-secret-minimum-32-characters-long',
  FRONTEND_URL: 'http://localhost:5173',
  VITE_API_URL: 'http://localhost:3001/api',
};

function run(label, cmd, cwd) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { cwd, stdio: 'inherit', env, shell: true });
  console.log(`✓ ${label}`);
}

let failed = false;

try {
  run('Backend — prisma validate', 'npm run validate', backend);
  run('Backend — prisma generate', 'npx prisma generate', backend);
  run('Backend — tests', 'npm test', backend);

  const syntaxFiles = [
    'src/index.js',
    'src/controllers/authController.js',
    'src/controllers/verifyController.js',
    'src/services/mrzService.js',
    'src/services/amlService.js',
    'src/services/groqService.js',
    'src/services/ocrService.js',
    'src/services/pdfService.js',
  ];
  for (const file of syntaxFiles) {
    run(`Backend — syntax ${file}`, `node --check ${file}`, backend);
  }

  run('Frontend — eslint', 'npm run lint', frontend);
  run('Frontend — build', 'npm run build', frontend);

  console.log('\n✅ CI local completado con éxito — equivalente a .github/workflows/ci.yml\n');
} catch (err) {
  failed = true;
  console.error('\n❌ CI local falló\n');
  process.exit(1);
}
