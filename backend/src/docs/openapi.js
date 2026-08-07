const { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } = require('@asteasolutions/zod-to-openapi');
const { z } = require('zod');

// Must extend Zod before schemas are registered
extendZodWithOpenApi(z);

const akuntan = require('../validators/akuntan');
const aslap = require('../validators/aslap');
const gizi = require('../validators/gizi');
const laporan = require('../validators/laporan');
const mitra = require('../validators/mitra');

const registry = new OpenAPIRegistry();

// Register Security Scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT'
});

const defaultResponses = {
  200: { description: 'Success' },
  400: { description: 'Bad Request' },
  401: { description: 'Unauthorized' },
  404: { description: 'Not Found' },
  500: { description: 'Internal Server Error' }
};

const routeDefinitions = [
  // ================= AKUNTAN =================
  { method: 'post', path: '/api/akuntan/dokumen-resmi', module: 'akuntan', schema: akuntan.dokumenResmiSchema, target: 'body', summary: 'Buat dokumen resmi baru' },
  { method: 'post', path: '/api/akuntan/jurnal-transaksi', module: 'akuntan', schema: akuntan.jurnalSchema, target: 'body', summary: 'Buat jurnal transaksi' },
  { method: 'post', path: '/api/akuntan/jurnal-transaksi/bulk-generate', module: 'akuntan', schema: akuntan.bulkGenerateSchema, target: 'body', summary: 'Bulk generate jurnal transaksi' },
  { method: 'post', path: '/api/akuntan/po', module: 'akuntan', schema: akuntan.poSchema, target: 'body', summary: 'Buat Purchase Order (PO)' },
  { method: 'post', path: '/api/akuntan/rab-harian', module: 'akuntan', schema: akuntan.rabSchema, target: 'body', summary: 'Buat RAB harian' },
  { method: 'put', path: '/api/akuntan/rab-harian/{id}', module: 'akuntan', schema: akuntan.rabHarianUpdateSchema, target: 'body', summary: 'Update RAB harian' },
  { method: 'put', path: '/api/akuntan/rab-harian/{id}/items', module: 'akuntan', schema: akuntan.rabHarianItemsSchema, target: 'body', summary: 'Update items RAB harian' },
  { method: 'post', path: '/api/akuntan/anggaran-harian', module: 'akuntan', schema: akuntan.anggaranHarianSchema, target: 'body', summary: 'Buat anggaran harian' },
  { method: 'post', path: '/api/akuntan/saldo-awal-barang', module: 'akuntan', schema: akuntan.saldoAwalBarangSchema, target: 'body', summary: 'Set saldo awal barang' },
  { method: 'post', path: '/api/akuntan/mutasi-stok', module: 'akuntan', schema: akuntan.mutasiStokSchema, target: 'body', summary: 'Buat mutasi stok' },

  // ================= ASLAP =================
  { method: 'post', path: '/api/aslap/grup-hari', module: 'aslap', schema: aslap.grupHariSchema, target: 'body', summary: 'Buat grup hari' },
  { method: 'put', path: '/api/aslap/grup-hari/{id}', module: 'aslap', schema: aslap.grupHariUpdateSchema, target: 'body', summary: 'Update grup hari' },
  { method: 'get', path: '/api/aslap/laporan/aggregate', module: 'aslap', schema: aslap.laporanPeriodeSchema, target: 'query', summary: 'Get laporan aggregate' },
  { method: 'get', path: '/api/aslap/laporan/bulanan', module: 'aslap', schema: aslap.laporanBulananSchema, target: 'query', summary: 'Get laporan bulanan' },
  { method: 'get', path: '/api/aslap/laporan/per-bulan', module: 'aslap', schema: aslap.laporanBulananSchema, target: 'query', summary: 'Get laporan per bulan' },
  { method: 'get', path: '/api/aslap/laporan/bulanan/pdf', module: 'aslap', schema: aslap.laporanBulananSchema, target: 'query', summary: 'Export PDF laporan bulanan' },
  { method: 'get', path: '/api/aslap/laporan/per-bulan/pdf', module: 'aslap', schema: aslap.laporanBulananSchema, target: 'query', summary: 'Export PDF laporan per bulan' },
  { method: 'get', path: '/api/aslap/laporan/harian', module: 'aslap', schema: aslap.laporanHarianSchema, target: 'query', summary: 'Get laporan harian' },
  { method: 'get', path: '/api/aslap/laporan/harian/pdf', module: 'aslap', schema: aslap.laporanHarianSchema, target: 'query', summary: 'Export PDF laporan harian' },
  { method: 'get', path: '/api/aslap/laporan/periode', module: 'aslap', schema: aslap.laporanPeriodeSchema, target: 'query', summary: 'Get laporan periode' },
  { method: 'get', path: '/api/aslap/laporan/per-periode', module: 'aslap', schema: aslap.laporanPeriodeSchema, target: 'query', summary: 'Get laporan per periode' },
  { method: 'get', path: '/api/aslap/laporan/periode/pdf', module: 'aslap', schema: aslap.laporanPeriodeSchema, target: 'query', summary: 'Export PDF laporan periode' },
  { method: 'get', path: '/api/aslap/laporan/per-periode/pdf', module: 'aslap', schema: aslap.laporanPeriodeSchema, target: 'query', summary: 'Export PDF laporan per periode' },
  { method: 'get', path: '/api/aslap/laporan/per-kelas', module: 'aslap', schema: aslap.laporanPerKelasSchema, target: 'query', summary: 'Get laporan per kelas' },
  { method: 'get', path: '/api/aslap/laporan/per-kelas/pdf', module: 'aslap', schema: aslap.laporanPerKelasSchema, target: 'query', summary: 'Export PDF laporan per kelas' },
  { method: 'post', path: '/api/aslap/sekolah', module: 'aslap', schema: aslap.sekolahSchema, target: 'body', summary: 'Tambah sekolah' },
  { method: 'put', path: '/api/aslap/sekolah/{id}', module: 'aslap', schema: aslap.sekolahUpdateSchema, target: 'body', summary: 'Update sekolah' },
  { method: 'post', path: '/api/aslap/penerima-manfaat', module: 'aslap', schema: aslap.penerimaManfaatSchema, target: 'body', summary: 'Tambah penerima manfaat' },
  { method: 'put', path: '/api/aslap/penerima-manfaat/{id}', module: 'aslap', schema: aslap.penerimaManfaatUpdateSchema, target: 'body', summary: 'Update penerima manfaat' },
  { method: 'put', path: '/api/aslap/po/{id}/approve', module: 'aslap', schema: aslap.poApproveSchema, target: 'body', summary: 'Approve PO' },
  { method: 'post', path: '/api/aslap/sekolah-kelas-detail', module: 'aslap', schema: aslap.grupKelasSchema, target: 'body', summary: 'Tambah sekolah kelas detail' },
  { method: 'put', path: '/api/aslap/sekolah-kelas-detail/{id}', module: 'aslap', schema: aslap.grupKelasUpdateSchema, target: 'body', summary: 'Update sekolah kelas detail' },

  // ================= GIZI =================
  { method: 'post', path: '/api/gizi/alergi-catatan', module: 'gizi', schema: gizi.alergiSchema, target: 'body', summary: 'Tambah catatan alergi' },
  { method: 'put', path: '/api/gizi/alergi-catatan/{id}', module: 'gizi', schema: gizi.alergiUpdateSchema, target: 'body', summary: 'Update catatan alergi' },
  { method: 'get', path: '/api/gizi/laporan/organoleptik', module: 'gizi', schema: gizi.laporanOrganoleptikQuerySchema, target: 'query', summary: 'Get laporan organoleptik' },
  { method: 'get', path: '/api/gizi/laporan/organoleptik/pdf', module: 'gizi', schema: gizi.laporanOrganoleptikQuerySchema, target: 'query', summary: 'Export PDF laporan organoleptik' },
  { method: 'get', path: '/api/gizi/laporan/pemenuhan-gizi', module: 'gizi', schema: gizi.laporanPemenuhanGiziQuerySchema, target: 'query', summary: 'Get laporan pemenuhan gizi' },
  { method: 'get', path: '/api/gizi/laporan/pemenuhan-gizi/pdf', module: 'gizi', schema: gizi.laporanPemenuhanGiziQuerySchema, target: 'query', summary: 'Export PDF laporan pemenuhan gizi' },
  { method: 'get', path: '/api/gizi/laporan/rekap-menu', module: 'gizi', schema: gizi.laporanRekapMenuQuerySchema, target: 'query', summary: 'Get laporan rekap menu' },
  { method: 'get', path: '/api/gizi/laporan/rekap-menu/pdf', module: 'gizi', schema: gizi.laporanRekapMenuQuerySchema, target: 'query', summary: 'Export PDF laporan rekap menu' },
  { method: 'post', path: '/api/gizi/master-menu', module: 'gizi', schema: gizi.menuSchema, target: 'body', summary: 'Tambah master menu' },
  { method: 'put', path: '/api/gizi/master-menu/{id}', module: 'gizi', schema: gizi.masterMenuUpdateSchema, target: 'body', summary: 'Update master menu' },
  { method: 'put', path: '/api/gizi/master-target/{id}', module: 'gizi', schema: gizi.masterTargetGiziSchema, target: 'body', summary: 'Update master target gizi' },
  { method: 'post', path: '/api/gizi/menu-harian', module: 'gizi', schema: gizi.menuHarianSchema, target: 'body', summary: 'Tambah menu harian' },
  { method: 'put', path: '/api/gizi/menu-harian/{id}', module: 'gizi', schema: gizi.menuHarianUpdateSchema, target: 'body', summary: 'Update menu harian' },
  { method: 'post', path: '/api/gizi/menu-harian-blok', module: 'gizi', schema: gizi.menuHarianBlokSchema, target: 'body', summary: 'Tambah menu harian blok' },
  { method: 'post', path: '/api/gizi/menu-item', module: 'gizi', schema: gizi.menuItemSchema, target: 'body', summary: 'Tambah menu item' },
  { method: 'put', path: '/api/gizi/menu-item/{id}', module: 'gizi', schema: gizi.menuItemUpdateSchema, target: 'body', summary: 'Update menu item' },
  { method: 'post', path: '/api/gizi/menu-item-bahan', module: 'gizi', schema: gizi.menuItemBahanSchema, target: 'body', summary: 'Tambah menu item bahan' },
  { method: 'put', path: '/api/gizi/menu-item-bahan/{id}', module: 'gizi', schema: gizi.menuItemBahanUpdateSchema, target: 'body', summary: 'Update menu item bahan' },
  { method: 'post', path: '/api/gizi/menu-organoleptik', module: 'gizi', schema: gizi.organoleptikSchema, target: 'body', summary: 'Tambah menu organoleptik' },
  { method: 'put', path: '/api/gizi/menu-organoleptik/{id}', module: 'gizi', schema: gizi.organoleptikUpdateSchema, target: 'body', summary: 'Update menu organoleptik' },
  { method: 'post', path: '/api/gizi/menu-target-gizi', module: 'gizi', schema: gizi.targetGiziSchema, target: 'body', summary: 'Tambah menu target gizi' },
  { method: 'put', path: '/api/gizi/menu-target-gizi/{id}', module: 'gizi', schema: gizi.targetGiziUpdateSchema, target: 'body', summary: 'Update menu target gizi' },
  { method: 'post', path: '/api/gizi/pengiriman', module: 'gizi', schema: gizi.pengirimanSchema, target: 'body', summary: 'Tambah pengiriman makanan' },
  { method: 'put', path: '/api/gizi/pengiriman/{id}', module: 'gizi', schema: gizi.pengirimanUpdateSchema, target: 'body', summary: 'Update pengiriman makanan' },

  // ================= LAPORAN =================
  { method: 'get', path: '/api/laporan/bapsd', module: 'laporan', schema: laporan.laporanBapsdSchema, target: 'query', summary: 'Laporan BAPSD' },
  { method: 'get', path: '/api/laporan/bapsd/pdf', module: 'laporan', schema: laporan.laporanBapsdSchema, target: 'query', summary: 'PDF Laporan BAPSD' },
  { method: 'get', path: '/api/laporan/bkk', module: 'laporan', schema: laporan.laporanBkkSchema, target: 'query', summary: 'Laporan BKK' },
  { method: 'get', path: '/api/laporan/bkk/pdf', module: 'laporan', schema: laporan.laporanBkkSchema, target: 'query', summary: 'PDF Laporan BKK' },
  { method: 'get', path: '/api/laporan/bku', module: 'laporan', schema: laporan.laporanBkuSchema, target: 'query', summary: 'Laporan BKU' },
  { method: 'get', path: '/api/laporan/bku/pdf', module: 'laporan', schema: laporan.laporanBkuSchema, target: 'query', summary: 'PDF Laporan BKU' },
  { method: 'get', path: '/api/laporan/bku/export-excel', module: 'laporan', schema: laporan.laporanBkuSchema, target: 'query', summary: 'Excel Laporan BKU' },
  { method: 'get', path: '/api/laporan/catatan/pdf', module: 'laporan', schema: laporan.laporanBkuSchema, target: 'query', summary: 'PDF Catatan BKU' },
  { method: 'get', path: '/api/laporan/bp', module: 'laporan', schema: laporan.laporanBpSchema, target: 'query', summary: 'Laporan BP' },
  { method: 'get', path: '/api/laporan/btt', module: 'laporan', schema: laporan.laporanBttSchema, target: 'query', summary: 'Laporan BTT' },
  { method: 'get', path: '/api/laporan/btt/pdf', module: 'laporan', schema: laporan.laporanBttSchema, target: 'query', summary: 'PDF Laporan BTT' },
  { method: 'get', path: '/api/laporan/harian', module: 'laporan', schema: laporan.laporanHarianSchema, target: 'query', summary: 'Laporan Harian' },
  { method: 'get', path: '/api/laporan/harian/pdf', module: 'laporan', schema: laporan.laporanHarianSchema, target: 'query', summary: 'PDF Laporan Harian' },
  { method: 'get', path: '/api/laporan/kebutuhan-belanja-bahan', module: 'laporan', schema: laporan.laporanKebutuhanBelanjaSchema, target: 'query', summary: 'Laporan Kebutuhan Belanja Bahan' },
  { method: 'get', path: '/api/laporan/kebutuhan-belanja/pdf', module: 'laporan', schema: laporan.laporanKebutuhanBelanjaSchema, target: 'query', summary: 'PDF Laporan Kebutuhan Belanja' },
  { method: 'get', path: '/api/laporan/lbbp', module: 'laporan', schema: laporan.laporanLbbpSchema, target: 'query', summary: 'Laporan LBBP' },
  { method: 'get', path: '/api/laporan/lbbp/pdf', module: 'laporan', schema: laporan.laporanLbbpSchema, target: 'query', summary: 'PDF Laporan LBBP' },
  { method: 'get', path: '/api/laporan/lpa', module: 'laporan', schema: laporan.laporanLpaSchema, target: 'query', summary: 'Laporan LPA' },
  { method: 'get', path: '/api/laporan/lpa/pdf', module: 'laporan', schema: laporan.laporanLpaSchema, target: 'query', summary: 'PDF Laporan LPA' },
  { method: 'get', path: '/api/laporan/lpd2m', module: 'laporan', schema: laporan.laporanMultiPeriodeSchema, target: 'query', summary: 'Laporan LPD2M' },
  { method: 'get', path: '/api/laporan/lpd2m/pdf', module: 'laporan', schema: laporan.laporanMultiPeriodeSchema, target: 'query', summary: 'PDF Laporan LPD2M' },
  { method: 'get', path: '/api/laporan/lra', module: 'laporan', schema: laporan.laporanMultiPeriodeSchema, target: 'query', summary: 'Laporan LRA' },
  { method: 'get', path: '/api/laporan/lra/pdf', module: 'laporan', schema: laporan.laporanMultiPeriodeSchema, target: 'query', summary: 'PDF Laporan LRA' },
  { method: 'get', path: '/api/laporan/lra/export-excel', module: 'laporan', schema: laporan.laporanMultiPeriodeSchema, target: 'query', summary: 'Excel Laporan LRA' },
  { method: 'get', path: '/api/laporan/neraca-saldo', module: 'laporan', schema: laporan.laporanNeracaSchema, target: 'query', summary: 'Laporan Neraca Saldo' },
  { method: 'get', path: '/api/laporan/neraca-saldo/pdf', module: 'laporan', schema: laporan.laporanNeracaSchema, target: 'query', summary: 'PDF Laporan Neraca Saldo' },
  { method: 'get', path: '/api/laporan/per-bulan', module: 'laporan', schema: laporan.laporanAnggaranSchema, target: 'query', summary: 'Laporan Per Bulan' },
  { method: 'get', path: '/api/laporan/per-bulan/pdf', module: 'laporan', schema: laporan.laporanAnggaranSchema, target: 'query', summary: 'PDF Laporan Per Bulan' },
  { method: 'get', path: '/api/laporan/per-periode', module: 'laporan', schema: laporan.laporanRekapSchema, target: 'query', summary: 'Laporan Per Periode' },
  { method: 'get', path: '/api/laporan/per-periode/pdf', module: 'laporan', schema: laporan.laporanRekapSchema, target: 'query', summary: 'PDF Laporan Per Periode' },
  { method: 'get', path: '/api/laporan/ringkasan-anggaran', module: 'laporan', schema: laporan.laporanAnggaranSchema, target: 'query', summary: 'Laporan Ringkasan Anggaran' },
  { method: 'get', path: '/api/laporan/sptj', module: 'laporan', schema: laporan.laporanRekapSchema, target: 'query', summary: 'Laporan SPTJ' },
  { method: 'get', path: '/api/laporan/sptj/pdf', module: 'laporan', schema: laporan.laporanRekapSchema, target: 'query', summary: 'PDF Laporan SPTJ' },
  { method: 'get', path: '/api/laporan/stock-barang', module: 'laporan', schema: laporan.laporanStokSchema, target: 'query', summary: 'Laporan Stock Barang' },
  { method: 'get', path: '/api/laporan/stock-barang/export-excel', module: 'laporan', schema: laporan.laporanStokSchema, target: 'query', summary: 'Excel Laporan Stock Barang' },
  { method: 'get', path: '/api/laporan/stock-barang/pdf', module: 'laporan', schema: laporan.laporanStokSchema, target: 'query', summary: 'PDF Laporan Stock Barang' },

  // ================= MITRA =================
  { method: 'put', path: '/api/mitra/bahan-pokok/{id}', module: 'mitra', schema: mitra.bahanPokokSchema, target: 'body', summary: 'Update bahan pokok' },
  { method: 'post', path: '/api/mitra/kendaraan', module: 'mitra', schema: mitra.kendaraanSchema, target: 'body', summary: 'Tambah kendaraan' },
  { method: 'put', path: '/api/mitra/kendaraan/{id}', module: 'mitra', schema: mitra.updateKendaraanSchema, target: 'body', summary: 'Update kendaraan' },
  { method: 'post', path: '/api/mitra/harga-bahan', module: 'mitra', schema: mitra.hargaBahanSchema, target: 'body', summary: 'Tambah harga bahan' },
  { method: 'put', path: '/api/mitra/harga-bahan/{id}', module: 'mitra', schema: mitra.updateHargaBahanSchema, target: 'body', summary: 'Update harga bahan' },
  { method: 'put', path: '/api/mitra/po/{id}/realisasi', module: 'mitra', schema: mitra.realisasiPoSchema, target: 'body', summary: 'Update realisasi PO' },
  { method: 'get', path: '/api/mitra/po/{id}/pdf', module: 'mitra', schema: mitra.idParamSchema, target: 'params', summary: 'PDF PO Mitra' },
  { method: 'get', path: '/api/mitra/laporan/realisasi-po', module: 'mitra', schema: mitra.realisasiPoQuerySchema, target: 'query', summary: 'Laporan realisasi PO' },
  { method: 'get', path: '/api/mitra/laporan/realisasi-po/pdf', module: 'mitra', schema: mitra.realisasiPoQuerySchema, target: 'query', summary: 'PDF Laporan realisasi PO' },

  // ================= AUTH (MANUAL INLINE SCHEMAS) =================
  { method: 'post', path: '/api/auth/login', module: 'auth', target: 'body', schema: z.object({ username: z.string(), password: z.string() }), summary: 'Login user' },
  { method: 'get', path: '/api/auth/me', module: 'auth', summary: 'Get profil user yang sedang login' },
  { method: 'put', path: '/api/auth/profile', module: 'auth', target: 'body', schema: z.object({ nama: z.string().optional(), username: z.string().optional(), password: z.string().min(6).optional() }), summary: 'Update profil user' },
  {
    method: 'post',
    path: '/api/auth/ttd',
    module: 'auth',
    target: 'body',
    contentType: 'multipart/form-data',
    schema: z.object({ ttd: z.string().openapi({ format: 'binary', description: 'File TTD (PNG/JPG, maks 5MB)' }) }),
    summary: 'Upload TTD user'
  },
  { method: 'get', path: '/api/auth/ttd', module: 'auth', summary: 'Get path TTD user' },
  { method: 'delete', path: '/api/auth/ttd', module: 'auth', summary: 'Hapus TTD user' },
  { method: 'get', path: '/api/my-permissions', module: 'my-permissions', summary: 'Get role dan daftar permission user yang sedang login' },

  // ================= ADMIN (MANUAL INLINE SCHEMAS) =================
  { method: 'get', path: '/api/admin/users', module: 'admin', summary: 'Get daftar seluruh user' },
  {
    method: 'post',
    path: '/api/admin/users',
    module: 'admin',
    target: 'body',
    schema: z.object({
      nama: z.string(),
      username: z.string(),
      password: z.string().min(6),
      role: z.enum(['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN'])
    }),
    summary: 'Buat user baru'
  },
  {
    method: 'put',
    path: '/api/admin/users/{id}',
    module: 'admin',
    target: 'body',
    schema: z.object({
      nama: z.string().optional(),
      role: z.enum(['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN']).optional(),
      aktif: z.boolean().optional(),
      password: z.string().optional()
    }),
    summary: 'Update data user'
  },
  { method: 'delete', path: '/api/admin/users/{id}', module: 'admin', summary: 'Nonaktifkan user (soft delete)' },
  { method: 'get', path: '/api/admin/resources', module: 'admin', summary: 'Get daftar seluruh resource (akses admin-permission READ)' },
  {
    method: 'get',
    path: '/api/admin/permissions',
    module: 'admin',
    target: 'query',
    schema: z.object({
      role: z.enum(['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN']).optional().openapi({ description: 'Filter by role' }),
      resourceId: z.string().optional().openapi({ description: 'Filter by resource id' }),
      resource: z.string().optional().openapi({ description: 'Filter by resource kode' })
    }),
    summary: 'Get daftar role permission (filter by role/resource)'
  },
  {
    method: 'post',
    path: '/api/admin/permissions',
    module: 'admin',
    target: 'body',
    schema: z.object({
      role: z.enum(['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN']),
      resourceId: z.string().optional().openapi({ description: 'UUID resource (salah satu dari resourceId atau resourceKode wajib diisi)' }),
      resourceKode: z.string().optional().openapi({ description: 'Kode resource (alternatif resourceId)' }),
      aksi: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'])
    }),
    summary: 'Buat role permission baru'
  },
  {
    method: 'put',
    path: '/api/admin/permissions/{id}',
    module: 'admin',
    target: 'body',
    schema: z.object({
      role: z.enum(['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN']).optional(),
      resourceId: z.string().optional().openapi({ description: 'UUID resource' }),
      resourceKode: z.string().optional().openapi({ description: 'Kode resource (alternatif resourceId)' }),
      aksi: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT']).optional()
    }),
    summary: 'Update role permission'
  },
  { method: 'delete', path: '/api/admin/permissions/{id}', module: 'admin', summary: 'Hapus role permission' },

  // ================= KEPALA (MANUAL INLINE SCHEMAS) =================
  {
    method: 'post',
    path: '/api/kepala/approval',
    module: 'kepala',
    target: 'body',
    schema: z.object({
      menuHarianId: z.string().optional(),
      rabHarianId: z.string().optional(),
      status: z.enum(['DISETUJUI', 'DITOLAK']),
      catatan: z.string().optional()
    }),
    summary: 'Proses approval menu harian atau RAB harian'
  },
  {
    method: 'get',
    path: '/api/kepala/approval',
    module: 'kepala',
    target: 'query',
    schema: z.object({
      periodeId: z.string(),
      status: z.enum(['DISETUJUI', 'DITOLAK']).optional(),
      targetType: z.enum(['MENU', 'RAB']).optional(),
      limit: z.string().optional(),
      offset: z.string().optional()
    }),
    summary: 'Get riwayat approval'
  },

  // ================= MITRA (MANUAL INLINE SCHEMAS) =================
  { method: 'get', path: '/api/mitra/bahan-pokok', module: 'mitra', summary: 'Get daftar master bahan pokok' },
  { method: 'get', path: '/api/mitra/kendaraan', module: 'mitra', summary: 'Get daftar kendaraan' },
  { method: 'get', path: '/api/mitra/kendaraan/{id}', module: 'mitra', summary: 'Get detail kendaraan' },
  { method: 'delete', path: '/api/mitra/kendaraan/{id}', module: 'mitra', summary: 'Hapus kendaraan' },
  { method: 'get', path: '/api/mitra/harga-bahan', module: 'mitra', target: 'query', schema: z.object({ periodeId: z.string() }), summary: 'Get daftar harga bahan pokok per periode' },
  { method: 'get', path: '/api/mitra/harga-bahan/{id}', module: 'mitra', summary: 'Get detail harga bahan pokok' },
  { method: 'delete', path: '/api/mitra/harga-bahan/{id}', module: 'mitra', summary: 'Hapus harga bahan pokok per periode' },
  { method: 'get', path: '/api/mitra/po/kebutuhan', module: 'mitra', target: 'query', schema: z.object({ tanggal: z.string(), periodeId: z.string() }), summary: 'Get estimasi kebutuhan bahan pokok untuk PO' },
  { method: 'post', path: '/api/mitra/po', module: 'mitra', summary: 'Buat PO Mitra (deprecated)' },
  { method: 'get', path: '/api/mitra/po/list', module: 'mitra', target: 'query', schema: z.object({ periodeId: z.string() }), summary: 'Get daftar PO per periode' },

  // ================= AKUNTAN MASTER (MANUAL INLINE SCHEMAS) =================
  { method: 'get', path: '/api/akuntan/akun', module: 'akuntan', summary: 'Get daftar akun aktif' },
  { method: 'get', path: '/api/akuntan/supplier', module: 'akuntan', summary: 'Get daftar supplier aktif' },
  { method: 'post', path: '/api/akuntan/supplier', module: 'akuntan', target: 'body', schema: z.object({ nama: z.string(), kontak: z.string().optional() }), summary: 'Buat supplier baru' },
  { method: 'get', path: '/api/akuntan/periode/latest-setup', module: 'akuntan', summary: 'Get setup lembaga periode terakhir' },
  {
    method: 'post',
    path: '/api/akuntan/periode',
    module: 'akuntan',
    target: 'body',
    schema: z.object({
      tanggalMulai: z.string(),
      tanggalSelesai: z.string(),
      anggaranAlokasi: z.union([z.number(), z.string()]),
      totalDanaDiterima: z.union([z.number(), z.string()]).optional(),
      namaLembaga: z.string(),
      alamat: z.string(),
      namaKepalaSPPG: z.string(),
      namaAkuntanSPPG: z.string(),
      namaYayasan: z.string(),
      ketuaYayasan: z.string(),
      nomorRekeningVA: z.string(),
      tahunAnggaran: z.union([z.number(), z.string()]),
      awalPeriodeBerikutnya: z.string(),
      tanggalPelaporan: z.string(),
      tempatPelaporan: z.string()
    }),
    summary: 'Buat periode baru beserta setup lembaga'
  },
  {
    method: 'post',
    path: '/api/akuntan/periode/{id}/tutup-periode',
    module: 'akuntan',
    target: 'body',
    schema: z.object({ periodeTargetId: z.string().optional(), overwrite: z.boolean().optional() }),
    summary: 'Tutup periode dan carry-over saldo awal'
  },
  {
    method: 'put',
    path: '/api/akuntan/periode/{id}',
    module: 'akuntan',
    target: 'body',
    schema: z.object({
      status: z.enum(['DRAFT', 'AKTIF', 'SELESAI']).optional(),
      anggaranAlokasi: z.union([z.number(), z.string()]).optional(),
      totalDanaDiterima: z.union([z.number(), z.string()]).optional()
    }),
    summary: 'Update status atau detail periode'
  },
  { method: 'get', path: '/api/akuntan/jenis-pekerjaan', module: 'akuntan', target: 'query', schema: z.object({ all: z.string().optional() }), summary: 'Get daftar jenis pekerjaan' },
  {
    method: 'post',
    path: '/api/akuntan/jenis-pekerjaan',
    module: 'akuntan',
    target: 'body',
    schema: z.object({
      nama: z.string(),
      tarifHarian: z.union([z.number(), z.string()]),
      aktif: z.boolean().optional()
    }),
    summary: 'Buat jenis pekerjaan baru'
  },
  {
    method: 'put',
    path: '/api/akuntan/jenis-pekerjaan/{id}',
    module: 'akuntan',
    target: 'body',
    schema: z.object({
      nama: z.string().optional(),
      tarifHarian: z.union([z.number(), z.string()]).optional(),
      aktif: z.boolean().optional()
    }),
    summary: 'Update jenis pekerjaan'
  },
  { method: 'delete', path: '/api/akuntan/jenis-pekerjaan/{id}', module: 'akuntan', summary: 'Hapus jenis pekerjaan' },
  { method: 'get', path: '/api/akuntan/hari-libur', module: 'akuntan', summary: 'Get daftar hari libur' },
  { method: 'post', path: '/api/akuntan/hari-libur', module: 'akuntan', target: 'body', schema: z.object({ tanggal: z.string(), keterangan: z.string().optional() }), summary: 'Tambah hari libur' },
  { method: 'delete', path: '/api/akuntan/hari-libur/{id}', module: 'akuntan', summary: 'Hapus hari libur' },
  { method: 'get', path: '/api/akuntan/kebutuhan-hitungan', module: 'akuntan', target: 'query', schema: z.object({ periodeId: z.string(), tanggal: z.string() }), summary: 'Get hitungan kebutuhan bahan pokok' },
  {
    method: 'post',
    path: '/api/akuntan/bahan-pokok',
    module: 'akuntan',
    target: 'body',
    schema: z.object({
      nama: z.string(),
      satuan: z.string(),
      tipePenyimpanan: z.string().optional(),
      konversiPerKg: z.union([z.number(), z.string()]).optional(),
      satuanHitungan: z.string().optional()
    }),
    summary: 'Buat master bahan pokok baru'
  },

  // ================= BUKTI LPD2M (MANUAL INLINE SCHEMAS) =================
  {
    method: 'post',
    path: '/api/laporan/lpd2m/bukti',
    module: 'laporan',
    target: 'body',
    contentType: 'multipart/form-data',
    schema: z.object({
      periodeId: z.string(),
      namaBukti: z.string(),
      jenis: z.string(),
      file: z.string().openapi({ format: 'binary', description: 'File bukti LPD2M (maks 10MB)' })
    }),
    summary: 'Upload dokumen bukti LPD2M'
  },
  { method: 'get', path: '/api/laporan/lpd2m/bukti', module: 'laporan', target: 'query', schema: z.object({ periodeId: z.string() }), summary: 'Get daftar dokumen bukti LPD2M' },
  { method: 'delete', path: '/api/laporan/lpd2m/bukti/{id}', module: 'laporan', summary: 'Hapus dokumen bukti LPD2M' },
  {
    method: 'get',
    path: '/api/audit-log',
    module: 'audit-log',
    target: 'query',
    schema: z.object({
      tanggalMulai: z.string().optional().openapi({ description: 'Filter awal rentang tanggal (ISO date)' }),
      tanggalSelesai: z.string().optional().openapi({ description: 'Filter akhir rentang tanggal (ISO date)' }),
      userId: z.string().optional().openapi({ description: 'Filter id user pelaku' }),
      aksi: z.enum(['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'KOREKSI']).optional().openapi({ description: 'Filter jenis aksi' }),
      resource: z.string().optional().openapi({ description: 'Filter entityType (nama model)' }),
      page: z.string().optional().openapi({ description: 'Nomor halaman (default 1)' }),
      limit: z.string().optional().openapi({ description: 'Jumlah per halaman (default 20, maks 100)' })
    }),
    summary: 'Get daftar AuditLog (filter + pagination) — akses AKUNTAN, MITRA, ADMIN'
  },

  // ================= CHAT (CHATBOT) =================
  {
    method: 'post',
    path: '/api/chat/api-key',
    module: 'chat',
    target: 'body',
    schema: z.object({
      provider: z.enum(['gemini', 'groq', 'openai']).openapi({ description: 'Provider AI' }),
      apiKey: z.string().min(8).openapi({ description: 'API key provider (disimpan terenkripsi, tidak pernah dikembalikan)' })
    }),
    summary: 'Simpan/update API key chatbot user (terenkripsi AES-256-GCM)'
  },
  {
    method: 'get',
    path: '/api/chat/api-key',
    module: 'chat',
    summary: 'Ambil info API key chatbot user (hanya 4 karakter pertama + mask)'
  },
  {
    method: 'delete',
    path: '/api/chat/api-key',
    module: 'chat',
    summary: 'Hapus API key chatbot user'
  },
  {
    method: 'post',
    path: '/api/chat',
    module: 'chat',
    target: 'body',
    schema: z.object({
      message: z.string().min(1).max(4000).openapi({ description: 'Pesan/pertanyaan ke AI' }),
      provider: z.enum(['gemini', 'groq', 'openai']).optional().openapi({ description: 'Override provider (default dari API key tersimpan)' }),
      model: z.string().optional().openapi({ description: 'Override model AI (default per provider)' })
    }),
    summary: 'Kirim pesan ke AI chatbot (rate-limited 15 req/15 menit per user)'
  }
];

routeDefinitions.forEach(route => {
  const reqObj = {};
  
  if (route.target === 'body' && route.schema) {
    reqObj.body = {
      content: {
        [route.contentType || 'application/json']: {
          schema: route.schema
        }
      }
    };
  } else if (route.target === 'query' && route.schema) {
    reqObj.query = route.schema;
  } else if (route.target === 'params' && route.schema) {
    reqObj.params = route.schema;
  }

  if (route.path.includes('{id}') && route.target !== 'params') {
    reqObj.params = z.object({ id: z.string() });
  }

  registry.registerPath({
    method: route.method,
    path: route.path,
    tags: [route.module],
    summary: route.summary,
    request: Object.keys(reqObj).length > 0 ? reqObj : undefined,
    responses: defaultResponses
  });
});

const generator = new OpenApiGeneratorV31(registry.definitions);
const openApiDocument = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'SIKOP-SPPG API',
    version: '2.0.0',
    description: 'API Documentation for SIKOP-SPPG Backend'
  },
  security: [
    { bearerAuth: [] }
  ]
});

const swaggerSpec = JSON.stringify(openApiDocument);

module.exports = {
  openApiDocument,
  swaggerSpec
};
