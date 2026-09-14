const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const prisma = new PrismaClient();
async function main() {
  if (process.argv.includes('--apply')) {
    const sql = fs.readFileSync(path.resolve(__dirname, '../sql/20260913-security-hardening.sql'), 'utf8');
    await prisma.$transaction(async tx => {
      // The statements come exclusively from this reviewed, versioned SQL file.
      for (const statement of sql.split('-- statement')) {
        if (statement.trim()) await tx.$executeRawUnsafe(statement);
      }
    }, { timeout: 30000 });
  }
  const rows = await prisma.$queryRaw`
    SELECT c.relname AS name, c.relrowsecurity AS rls,
      has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
      has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_insert
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('PasswordResetToken','RateLimit','EmailDelivery','JobState')`;
  if (rows.length !== 4 || rows.some(r => !r.rls || r.anon_insert || r.authenticated_insert)) {
    throw new Error('Security migration verification failed');
  }
  console.log(JSON.stringify({ verified: rows }));
}
main().catch(e => { console.error({ name: e.name, code: e.code, message: 'Security migration failed; inspect database connectivity/schema.' }); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
