const express = require("express");

const rabP12Router = require("./rabP12");
const rabHarianRouter = require("./rabHarian");
const jurnalRouter = require("./jurnal");
const dokumenResmiRouter = require("./dokumenResmi");
const nominatifUpahRouter = require("./nominatifUpah");
const stokRouter = require("./stok");
const masterRouter = require("./master");

const router = express.Router();

router.use("/rab-p12", rabP12Router);
router.use("/rab-harian", rabHarianRouter);
// /anggaran-harian bukan sub-path dari /rab-harian — mount terpisah (sub-router khusus)
router.use("/anggaran-harian", rabHarianRouter.anggaranHarianRouter);
router.use("/jurnal-transaksi", jurnalRouter);
router.use("/dokumen-resmi", dokumenResmiRouter);
router.use("/daftar-nominatif-upah", nominatifUpahRouter);
router.use("/saldo-awal-barang", stokRouter);
// /mutasi-stok dan /validasi-stok bukan sub-path dari /saldo-awal-barang — mount terpisah
router.use("/mutasi-stok", stokRouter.mutasiStokRouter);
router.use("/validasi-stok", stokRouter.validasiStokRouter);
// Endpoint master (akun, supplier, periode, jenis-pekerjaan, hari-libur, po, dll) relatif di root akuntan
router.use(masterRouter);

module.exports = router;
