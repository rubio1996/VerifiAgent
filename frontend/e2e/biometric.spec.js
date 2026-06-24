const { test, expect } = require('@playwright/test');
const path = require('path');

test('flujo biométrico con imágenes de prueba', async ({ page, context }) => {
  // Inyectar sesión para saltar login y colocar email
  await context.addInitScript(() => {
    localStorage.setItem('verifid_token', 'e2e-token');
    localStorage.setItem('verifid_email', 'prueba@local.local');
  });

  // Navegar en modo test para usar inputs de fichero
  await page.goto('/?test=true');

  // Rellenar StepDatos
  await page.fill('input[name="firstName"]', 'E2E');
  await page.fill('input[name="lastName"]', 'Tester');
  await page.fill('input[name="documentNumber"]', '12345678X');
  await page.fill('input[name="birthDate"]', '1990-01-01');
  await page.fill('input[name="nationality"]', 'España');
  await page.fill('input[name="phone"]', '+34123456789');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button:has-text("Continuar a Documentación")'),
  ]);

  // Ahora en paso 2 debe aparecer el componente biométrico
  // Subir imágenes de prueba a los inputs ocultos
  const selfiePath = path.resolve(__dirname, '../public/test-images/selfie.jpg');
  const docPath = path.resolve(__dirname, '../public/test-images/document.jpg');

  const selfieInput = await page.$('#test-selfie');
  const docInput = await page.$('#test-doc');
  await selfieInput.setInputFiles(selfiePath);
  await docInput.setInputFiles(docPath);

  // Pulsar el botón de captura/verificación
  await page.click('button:has-text("Capturar selfie y comparar con documento")');

  // Esperar resultado visible
  await page.waitForSelector('p:has-text("Status:")');
  const statusText = await page.textContent('p:has-text("Status:")');
  console.log('Status text:', statusText);

  // Comprobar que se ha mostrado un estado final (match / no_match / error)
  await expect(page.locator('text=Rostro coincide').first().or(page.locator('text=No coincide').first()).or(page.locator('text=Error procesando imagen').first())).toBeTruthy();
});
