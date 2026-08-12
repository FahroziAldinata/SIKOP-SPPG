'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function check() {
  const usernames = ['admin', 'aslap', 'mitra', 'akuntan', 'ahligizi', 'kepalasppg'];
  console.log('=== USER SEED VERIFICATION ===');
  let allValid = true;
  for (const username of usernames) {
    const u = await prisma.user.findUnique({ where: { username } });
    if (!u) {
      console.log(`${username}: NOT FOUND`);
      allValid = false;
      continue;
    }
    const match = await bcrypt.compare('ganti-password-ini', u.passwordHash);
    const rounds = bcrypt.getRounds(u.passwordHash);
    console.log(`${username}: passMatch=${match}, rounds=${rounds}, tokenVer=${u.tokenVersion}`);
    if (!match || rounds !== 12) {
      allValid = false;
    }
  }
  const sysConfig = await prisma.systemConfig.findUnique({ where: { id: 'system' } });
  console.log('=== SYSTEM CONFIG VERIFICATION ===');
  console.log('SystemConfig exists:', !!sysConfig, sysConfig ? `provider=${sysConfig.provider}` : 'null');
  await prisma.$disconnect();
  
  if (!allValid || !sysConfig) {
    console.error('VERIFICATION FAILED!');
    process.exit(1);
  }
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
