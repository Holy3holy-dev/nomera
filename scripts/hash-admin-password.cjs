'use strict';
const { hashPassword } = require('../netlify/functions/lib/admin-core.cjs');
if (!process.env.NOMERA_ADMIN_PASSWORD) {
  console.error('Set NOMERA_ADMIN_PASSWORD in your shell before running; never commit it.');
  process.exitCode=1;
} else {
  console.log(hashPassword(process.env.NOMERA_ADMIN_PASSWORD));
}
