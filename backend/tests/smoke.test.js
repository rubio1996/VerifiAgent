const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('backend smoke', () => {
  it('carga el módulo Express sin levantar el servidor', () => {
    process.env.JWT_SECRET = 'ci-test-secret-minimum-32-chars';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgresql://ci:ci@localhost:5432/verifid_ci';
    process.env.DIRECT_URL = 'postgresql://ci:ci@localhost:5432/verifid_ci';

    const app = require('../src/index');
    assert.ok(app);
    assert.equal(typeof app.use, 'function');
    assert.equal(typeof app.listen, 'function');
  });
});
