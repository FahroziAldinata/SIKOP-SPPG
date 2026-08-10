const { logger } = require('./logger');

const RBAC_RESOURCES = [
  { kode: 'aslap-master', nama: 'Master Data Aslap', modul: 'aslap' },
  { kode: 'aslap-periode', nama: 'Periode Aslap', modul: 'aslap' },
  { kode: 'aslap-input', nama: 'Input Penerima Manfaat', modul: 'aslap' },
  { kode: 'aslap-laporan', nama: 'Laporan Aslap', modul: 'aslap' },
  { kode: 'aslap-po-approval', nama: 'Approval PO Aslap', modul: 'aslap' },
  { kode: 'gizi-master', nama: 'Master Menu & Gizi', modul: 'gizi' },
  { kode: 'gizi-target', nama: 'Target Gizi', modul: 'gizi' },
  { kode: 'gizi-menu', nama: 'Rencana & Menu Harian', modul: 'gizi' },
  { kode: 'gizi-laporan', nama: 'Laporan Gizi', modul: 'gizi' },
  { kode: 'mitra-master', nama: 'Master Bahan & Supplier', modul: 'mitra' },
  { kode: 'mitra-po', nama: 'Pesanan Pembelian (PO)', modul: 'mitra' },
  { kode: 'mitra-pemeriksaan', nama: 'Pemeriksaan Bahan', modul: 'mitra' },
  { kode: 'akuntan-master', nama: 'Master Akun & Setup', modul: 'akuntan' },
  { kode: 'akuntan-akun', nama: 'Akun (Chart of Accounts)', modul: 'akuntan' },
  { kode: 'akuntan-jenis-pekerjaan', nama: 'Jenis Pekerjaan', modul: 'akuntan' },
  { kode: 'akuntan-rab', nama: 'RAB Harian', modul: 'akuntan' },
  { kode: 'akuntan-jurnal', nama: 'Jurnal Transaksi', modul: 'akuntan' },
  { kode: 'akuntan-stok', nama: 'Stok & Mutasi Barang', modul: 'akuntan' },
  { kode: 'akuntan-upah', nama: 'Daftar Upah Relawan', modul: 'akuntan' },
  { kode: 'kepala-approval', nama: 'Approval Kepala SPPG', modul: 'kepala' },
  { kode: 'laporan-resmi', nama: 'Dokumen & Laporan Resmi', modul: 'laporan' },
  { kode: 'admin-user', nama: 'Manajemen User', modul: 'admin' },
  { kode: 'admin-permission', nama: 'Manajemen Permission', modul: 'admin' },
  { kode: 'audit-log', nama: 'Audit Log Sistem', modul: 'admin' },
  { kode: 'laporan-bug', nama: 'Laporan Bug & Masalah', modul: 'admin' },
  { kode: 'chatbot', nama: 'Asisten AI Chatbot', modul: 'chat' },
  { kode: 'chatbot-config', nama: 'Konfigurasi Chatbot', modul: 'chatbot' },
  // Tool Registry v1 — resource status (READ-only, terpisah dari resource data penuh)
  { kode: 'gizi-menu-status', nama: 'Status Menu Harian (Chatbot)', modul: 'gizi' },
  { kode: 'akuntan-rab-status', nama: 'Status RAB Harian (Chatbot)', modul: 'akuntan' },
  { kode: 'mitra-po-status', nama: 'Status PO (Chatbot)', modul: 'mitra' },
  { kode: 'aslap-input-status', nama: 'Status Input Penerima Manfaat (Chatbot)', modul: 'aslap' }
];

const RBAC_ROLE_PERMISSIONS = [
  // AKUNTAN
  { role: 'AKUNTAN', resource: 'akuntan-master', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-master', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-master', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-master', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'akuntan-master', aksi: 'APPROVE' },
  { role: 'AKUNTAN', resource: 'akuntan-rab', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-rab', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-rab', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-rab', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'akuntan-jurnal', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-jurnal', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-jurnal', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-jurnal', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'akuntan-stok', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-stok', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-stok', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-stok', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'akuntan-upah', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-upah', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-upah', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-upah', aksi: 'DELETE' },
  // Penyempitan akses final (keputusan Rozi): akun & jenis-pekerjaan = resource terpisah dari akuntan-master
  { role: 'AKUNTAN', resource: 'akuntan-akun', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-akun', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-akun', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-akun', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'akuntan-jenis-pekerjaan', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'akuntan-jenis-pekerjaan', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'akuntan-jenis-pekerjaan', aksi: 'UPDATE' },
  { role: 'AKUNTAN', resource: 'akuntan-jenis-pekerjaan', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'aslap-master', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'aslap-periode', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'aslap-input', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'aslap-laporan', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'aslap-laporan', aksi: 'EXPORT' },
  { role: 'AKUNTAN', resource: 'gizi-master', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'gizi-menu', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'mitra-master', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'mitra-po', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'mitra-po', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'mitra-pemeriksaan', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'mitra-pemeriksaan', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'laporan-resmi', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'laporan-resmi', aksi: 'CREATE' },
  { role: 'AKUNTAN', resource: 'laporan-resmi', aksi: 'DELETE' },
  { role: 'AKUNTAN', resource: 'laporan-resmi', aksi: 'EXPORT' },
  { role: 'AKUNTAN', resource: 'laporan-bug', aksi: 'CREATE' },

  // KEPALA_SPPG — grant minimal: modul sendiri + ringkasan lintas modul + approve RAB
  // DICABUT (2026-08-08, Task B): aslap-input, gizi-menu, gizi-target, mitra-po, mitra-pemeriksaan,
  //   akuntan-jurnal, akuntan-upah, akuntan-akun, akuntan-jenis-pekerjaan, laporan-resmi:CREATE/DELETE
  { role: 'KEPALA_SPPG', resource: 'kepala-approval', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'kepala-approval', aksi: 'CREATE' },
  { role: 'KEPALA_SPPG', resource: 'kepala-approval', aksi: 'APPROVE' },
  { role: 'KEPALA_SPPG', resource: 'aslap-master', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'aslap-periode', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'aslap-laporan', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'aslap-laporan', aksi: 'EXPORT' },
  { role: 'KEPALA_SPPG', resource: 'gizi-master', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'gizi-laporan', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'gizi-laporan', aksi: 'EXPORT' },
  { role: 'KEPALA_SPPG', resource: 'mitra-master', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'akuntan-master', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'akuntan-rab', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'akuntan-rab', aksi: 'APPROVE' },
  { role: 'KEPALA_SPPG', resource: 'laporan-resmi', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'laporan-resmi', aksi: 'EXPORT' },
  { role: 'KEPALA_SPPG', resource: 'laporan-bug', aksi: 'CREATE' },

  // AHLI_GIZI
  { role: 'AHLI_GIZI', resource: 'gizi-master', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'gizi-master', aksi: 'CREATE' },
  { role: 'AHLI_GIZI', resource: 'gizi-master', aksi: 'UPDATE' },
  { role: 'AHLI_GIZI', resource: 'gizi-master', aksi: 'DELETE' },
  // Penyempitan akses final: target gizi = resource terpisah, hanya AHLI_GIZI (READ/UPDATE) (KEPALA_SPPG TIDAK diberi gizi-target: data operasional detail, bukan ringkasan/laporan)
  { role: 'AHLI_GIZI', resource: 'gizi-target', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'gizi-target', aksi: 'UPDATE' },
  { role: 'AHLI_GIZI', resource: 'gizi-menu', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'gizi-menu', aksi: 'CREATE' },
  { role: 'AHLI_GIZI', resource: 'gizi-menu', aksi: 'UPDATE' },
  { role: 'AHLI_GIZI', resource: 'gizi-menu', aksi: 'DELETE' },
  { role: 'AHLI_GIZI', resource: 'gizi-laporan', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'gizi-laporan', aksi: 'EXPORT' },
  { role: 'AHLI_GIZI', resource: 'aslap-master', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'aslap-periode', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'aslap-input', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'aslap-laporan', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'aslap-laporan', aksi: 'EXPORT' },
  { role: 'AHLI_GIZI', resource: 'mitra-master', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'laporan-bug', aksi: 'CREATE' },

  // ASLAP
  { role: 'ASLAP', resource: 'aslap-input', aksi: 'READ' },
  { role: 'ASLAP', resource: 'aslap-input', aksi: 'CREATE' },
  { role: 'ASLAP', resource: 'aslap-input', aksi: 'UPDATE' },
  { role: 'ASLAP', resource: 'aslap-input', aksi: 'DELETE' },
  { role: 'ASLAP', resource: 'aslap-master', aksi: 'READ' },
  { role: 'ASLAP', resource: 'aslap-periode', aksi: 'READ' },
  { role: 'ASLAP', resource: 'aslap-master', aksi: 'CREATE' },
  { role: 'ASLAP', resource: 'aslap-master', aksi: 'UPDATE' },
  { role: 'ASLAP', resource: 'aslap-master', aksi: 'DELETE' },
  { role: 'ASLAP', resource: 'aslap-laporan', aksi: 'READ' },
  { role: 'ASLAP', resource: 'aslap-laporan', aksi: 'EXPORT' },
  { role: 'ASLAP', resource: 'gizi-master', aksi: 'READ' },
  { role: 'ASLAP', resource: 'gizi-menu', aksi: 'READ' },
  { role: 'ASLAP', resource: 'mitra-master', aksi: 'READ' },
  { role: 'ASLAP', resource: 'mitra-po', aksi: 'READ' },
  { role: 'ASLAP', resource: 'mitra-pemeriksaan', aksi: 'READ' },
  { role: 'ASLAP', resource: 'mitra-pemeriksaan', aksi: 'CREATE' },
  { role: 'ASLAP', resource: 'aslap-po-approval', aksi: 'APPROVE' },
  { role: 'ASLAP', resource: 'laporan-bug', aksi: 'CREATE' },

  // MITRA
  { role: 'MITRA', resource: 'mitra-master', aksi: 'READ' },
  { role: 'MITRA', resource: 'mitra-master', aksi: 'CREATE' },
  { role: 'MITRA', resource: 'mitra-master', aksi: 'UPDATE' },
  { role: 'MITRA', resource: 'mitra-master', aksi: 'DELETE' },
  { role: 'MITRA', resource: 'mitra-po', aksi: 'READ' },
  { role: 'MITRA', resource: 'mitra-po', aksi: 'CREATE' },
  { role: 'MITRA', resource: 'mitra-po', aksi: 'UPDATE' },
  { role: 'MITRA', resource: 'mitra-pemeriksaan', aksi: 'READ' },
  { role: 'MITRA', resource: 'mitra-pemeriksaan', aksi: 'CREATE' },
  // Regresi fix: MITRA dulu boleh GET /api/aslap/periode (requireRole ASLAP,MITRA,...) —
  // via resource granular aslap-periode, TANPA membuka kategori/sekolah/posyandu (dulu 403 utk MITRA)
  { role: 'MITRA', resource: 'aslap-periode', aksi: 'READ' },
  { role: 'MITRA', resource: 'akuntan-master', aksi: 'READ' },
  { role: 'MITRA', resource: 'laporan-bug', aksi: 'CREATE' },

  // ADMIN
  { role: 'ADMIN', resource: 'admin-user', aksi: 'READ' },
  { role: 'ADMIN', resource: 'admin-user', aksi: 'CREATE' },
  { role: 'ADMIN', resource: 'admin-user', aksi: 'UPDATE' },
  { role: 'ADMIN', resource: 'admin-user', aksi: 'DELETE' },
  { role: 'ADMIN', resource: 'admin-permission', aksi: 'READ' },
  { role: 'ADMIN', resource: 'admin-permission', aksi: 'CREATE' },
  { role: 'ADMIN', resource: 'admin-permission', aksi: 'UPDATE' },
  { role: 'ADMIN', resource: 'admin-permission', aksi: 'DELETE' },
  { role: 'ADMIN', resource: 'audit-log', aksi: 'READ' },
  { role: 'ADMIN', resource: 'laporan-bug', aksi: 'READ' },
  { role: 'ADMIN', resource: 'laporan-bug', aksi: 'CREATE' },
  { role: 'ADMIN', resource: 'laporan-bug', aksi: 'UPDATE' },
  { role: 'ADMIN', resource: 'chatbot-config', aksi: 'MANAGE' },

  // CHATBOT — semua role (termasuk ADMIN) mendapat READ via grant eksplisit
  // (setelah bypass ADMIN dicabut Task C, ADMIN tidak lagi otomatis dapat semua resource)
  { role: 'ASLAP', resource: 'chatbot', aksi: 'READ' },
  { role: 'MITRA', resource: 'chatbot', aksi: 'READ' },
  { role: 'AHLI_GIZI', resource: 'chatbot', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'chatbot', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'chatbot', aksi: 'READ' },
  { role: 'ADMIN', resource: 'chatbot', aksi: 'READ' },

  // Tool Registry v1 — grant READ per resource-status
  // Prinsip: READ saja, tidak ada aksi lain. Role per keputusan FINAL Rozi.

  // gizi-menu-status: AHLI_GIZI (pemilik), ASLAP, KEPALA_SPPG (approver), AKUNTAN
  { role: 'AHLI_GIZI', resource: 'gizi-menu-status', aksi: 'READ' },
  { role: 'ASLAP', resource: 'gizi-menu-status', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'gizi-menu-status', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'gizi-menu-status', aksi: 'READ' },
  // MITRA dan role lain TIDAK mendapat gizi-menu-status

  // akuntan-rab-status: AKUNTAN (pemilik), KEPALA_SPPG (approver). AHLI_GIZI eksplisit TIDAK.
  { role: 'AKUNTAN', resource: 'akuntan-rab-status', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'akuntan-rab-status', aksi: 'READ' },
  // AHLI_GIZI, ASLAP, MITRA TIDAK mendapat akuntan-rab-status

  // mitra-po-status: MITRA (pemilik), KEPALA_SPPG, AKUNTAN
  { role: 'MITRA', resource: 'mitra-po-status', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'mitra-po-status', aksi: 'READ' },
  { role: 'AKUNTAN', resource: 'mitra-po-status', aksi: 'READ' },
  // ASLAP, AHLI_GIZI, dan role lain TIDAK mendapat mitra-po-status

  // aslap-input-status: ASLAP (pemilik), KEPALA_SPPG
  { role: 'ASLAP', resource: 'aslap-input-status', aksi: 'READ' },
  { role: 'KEPALA_SPPG', resource: 'aslap-input-status', aksi: 'READ' }
  // MITRA, AHLI_GIZI, AKUNTAN TIDAK mendapat aslap-input-status
];

async function seedRbacPermissions(prisma) {
  const resourceMap = {};

  for (const res of RBAC_RESOURCES) {
    const row = await prisma.resource.upsert({
      where: { kode: res.kode },
      update: { nama: res.nama, modul: res.modul, aktif: true },
      create: res
    });
    resourceMap[res.kode] = row.id;
  }

  for (const rp of RBAC_ROLE_PERMISSIONS) {
    const resourceId = resourceMap[rp.resource];
    if (!resourceId) continue;

    await prisma.rolePermission.upsert({
      where: {
        role_resourceId_aksi: {
          role: rp.role,
          resourceId,
          aksi: rp.aksi
        }
      },
      update: {},
      create: {
        role: rp.role,
        resourceId,
        aksi: rp.aksi
      }
    });
  }

  const { invalidatePermissionCache } = require('../middleware/auth');
  invalidatePermissionCache();

  if (logger && logger.info) {
    logger.info('[SEED] RBAC Resources & RolePermissions seeded successfully');
  }
}

module.exports = {
  RBAC_RESOURCES,
  RBAC_ROLE_PERMISSIONS,
  seedRbacPermissions
};
