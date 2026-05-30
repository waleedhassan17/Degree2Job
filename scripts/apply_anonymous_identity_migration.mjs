import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import { lookup } from 'dns/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFile = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, '..', 'supabase', 'deploy_anonymous_identity.sql');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  console.error(`Usage: DATABASE_URL='postgresql://...' node ${__filename} [path/to/sql-file]`);
  process.exit(1);
}

const sql = readFileSync(migrationFile, 'utf8');
let client;
try {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  try {
    const { address } = await lookup(host, { family: 4 });
    console.log(`Resolved ${host} -> ${address} (IPv4). Connecting using IPv4.`);
    const config = {
      host: address,
      port: parsed.port ? Number(parsed.port) : 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname && parsed.pathname.length > 1 ? parsed.pathname.slice(1) : undefined,
      ssl: parsed.searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false }
    };
    client = new Client(config);
  } catch (err) {
    console.warn('IPv4 lookup failed, falling back to connection string host:', err?.message || err);
    client = new Client({ connectionString: databaseUrl });
  }
} catch (err) {
  client = new Client({ connectionString: databaseUrl });
}

try {
  await client.connect();
  console.log(`Applying anonymous identity migration: ${migrationFile}`);
  await client.query(sql);
  console.log('Migration applied successfully');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
