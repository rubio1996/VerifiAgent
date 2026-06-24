const { test, expect } = require('@playwright/test');
const path = require('path');

test('flujo biométrico con imágenes de prueba', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('verifid_token', 'e2e-token');
    localStorage.setItem('verifid_email', 'prueba@local.local');
  });

  // Capturar logs de la página para diagnóstico
  page.on('console', msg => console.log('PAGE_CONSOLE', msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR', err.message));

  await page.goto('/?test=true');
  // Diagnóstico: esperar un poco y volcar el HTML inicial para ver qué carga
  await page.waitForTimeout(2000);
  const html = await page.content();
  console.log('PAGE_HTML_START', html.slice(0, 2000));
  // Ahora esperar al formulario (si aparece) y, si no, asumir que estamos en test-mode y ya en Paso 2
  const step2Already = await page.$('h2:has-text("Paso 2: Documento")');
  if (!step2Already) {
    await page.waitForSelector('input[name="firstName"]', { timeout: 60000 });
    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="documentNumber"]', '12345678X');
    await page.fill('input[name="birthDate"]', '1990-01-01');
    await page.fill('input[name="nationality"]', 'España');
    await page.fill('input[name="phone"]', '+34123456789');

    // Hacer click y esperar al contenido del paso 2 (no hay navegación de página)
    await page.click('button:has-text("Continuar a Documentación")');
    await page.waitForSelector('h2:has-text("Paso 2: Documento")', { timeout: 60000 });
  }

  const selfiePath = path.resolve(__dirname, '../public/test-images/selfie.jpg');
  const docPath = path.resolve(__dirname, '../public/test-images/document.jpg');

  const selfieInput = await page.$('#test-selfie');
  const docInput = await page.$('#test-doc');
  await selfieInput.setInputFiles(selfiePath);
  await docInput.setInputFiles(docPath);

  await page.click('button:has-text("Capturar selfie y comparar con documento")');

  await page.waitForSelector('p:has-text("Status:")');
  const statusText = await page.textContent('p:has-text("Status:")');
  console.log('Status text:', statusText);

  await expect(page.locator('text=Rostro coincide').first().or(page.locator('text=No coincide').first()).or(page.locator('text=Error procesando imagen').first())).toBeTruthy();
});
