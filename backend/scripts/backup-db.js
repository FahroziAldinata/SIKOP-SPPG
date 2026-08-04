/**
 * Script Backup Database PostgreSQL (pg_dump)
 *
 * Cara Penggunaan:
 *   cd backend
 *   DATABASE_URL="postgresql://user:pass@host:port/dbname" node scripts/backup-db.js
 *
 * CATATAN PGBOUNCER / SUPABASE:
 *   pg_dump WAJIB menggunakan direct connection (port 5432),
 *   BUKAN transaction pooler / PgBouncer (port 6543).
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function safeDecode(val) {
  if (!val) return '';
  try {
    return decodeURIComponent(val);
  } catch (err) {
    return val;
  }
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: Variabel environment DATABASE_URL tidak ditemukan.');
  console.error('Penggunaan: DATABASE_URL="postgresql://user:pass@host:port/dbname" node scripts/backup-db.js');
  process.exit(1);
}

let host, port, user, password, dbname;

try {
  const parsed = new URL(dbUrl);
  if (!parsed.protocol.startsWith('postgres')) {
    throw new Error('Protocol harus postgresql:// atau postgres://');
  }
  host = parsed.hostname;
  port = parsed.port || '5432';
  user = safeDecode(parsed.username);
  password = safeDecode(parsed.password);

  const rawDb = parsed.pathname.slice(1).split('?')[0].split('/')[0];
  dbname = safeDecode(rawDb);

  if (!host || !user || !dbname) {
    throw new Error('URL database tidak lengkap (membutuhkan host, user, dan dbname).');
  }
} catch (err) {
  console.error(`Error: Gagal mem-parse DATABASE_URL (${err.message}).`);
  process.exit(1);
}

const backupDir = path.resolve(__dirname, '..', 'backups');
try {
  fs.mkdirSync(backupDir, { recursive: true });
} catch (err) {
  console.error(`Error: Gagal membuat direktori backup (${err.message}).`);
  process.exit(1);
}

const filename = `sppg-backup-${getTimestamp()}.dump`;
const outfile = path.join(backupDir, filename);

const args = [
  '-Fc',
  '-h', host,
  '-p', String(port),
  '-U', user,
  '-d', dbname,
  '-f', outfile
];

const env = { ...process.env, PGPASSWORD: password };
const child = spawn('pg_dump', args, { env });

let stderrData = '';

child.stderr.on('data', (chunk) => {
  stderrData += chunk.toString();
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('Error: Executable "pg_dump" tidak ditemukan di PATH sistem.');
    console.error('Pastikan PostgreSQL client tools (pg_dump) telah terinstall dan terdaftar di PATH.');
  } else {
    console.error('Error saat menjalankan pg_dump:', err.message);
  }
  process.exit(1);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Proses pg_dump gagal dengan exit code ${code}.`);
    if (stderrData) {
      console.error('stderr:', stderrData.trim());
    }
    process.exit(code || 1);
  } else {
    console.log(`Backup database berhasil dibuat: ${outfile}`);
    process.exit(0);
  }
});
