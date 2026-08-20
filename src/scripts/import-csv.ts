import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from '../config/env.js';
import { initDb, getDb, closeDb } from '../services/db.js';

async function main() {
  loadEnv();
  await initDb();
  const db = getDb();

  const csvPath = process.argv[2] || resolve(process.cwd(), 'docs/manychat-export - Hoja 1.csv');
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  // Skip header: USUARIO,NOMBRE,PHONE,EMAIL
  const rows = lines.slice(1);

  let imported = 0;
  let skipped = 0;

  for (const line of rows) {
    // Simple CSV parse (no quotes in this data)
    const [username, name, phone, email] = line.split(',').map((s) => s.trim());

    if (!username && !email) {
      skipped++;
      continue;
    }

    await db`
      INSERT INTO leads (ig_user_id, ig_username, name, email, phone, source, status)
      VALUES (
        ${username || `unknown_${imported}`},
        ${username || null},
        ${name || null},
        ${email || null},
        ${phone || null},
        'manychat_import',
        ${email ? 'email_collected' : 'new'}
      )
      ON CONFLICT (ig_user_id)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, leads.name),
        email = COALESCE(EXCLUDED.email, leads.email),
        phone = COALESCE(EXCLUDED.phone, leads.phone),
        source = COALESCE(leads.source, EXCLUDED.source),
        updated_at = NOW()
    `;
    imported++;
  }

  console.log(`Done. Imported: ${imported}, Skipped: ${skipped}`);
  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
