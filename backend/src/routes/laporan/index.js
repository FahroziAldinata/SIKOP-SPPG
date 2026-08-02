const express = require("express");

const bkuRouter = require("./bku");
const bpRouter = require("./bp");
const neracaSaldoRouter = require("./neracaSaldo");
const lpaRouter = require("./lpa");
const sptjRouter = require("./sptj");
const bapsdRouter = require("./bapsd");
const kebutuhanBelanjaRouter = require("./kebutuhanBelanja");
const perPeriodeRouter = require("./perPeriode");
const perBulanRouter = require("./perBulan");
const stockBarangRouter = require("./stockBarang");
const ringkasanAnggaranRouter = require("./ringkasanAnggaran");
const harianRouter = require("./harian");
const lraRouter = require("./lra");
const lpd2mRouter = require("./lpd2m");
const bttRouter = require("./btt");
const lbbpRouter = require("./lbbp");
const bkkRouter = require("./bkk");

const router = express.Router();

router.use("/bku", bkuRouter);
if (bkuRouter.catatanRouter) {
  router.use("/catatan", bkuRouter.catatanRouter);
}
router.use("/bp", bpRouter);
router.use("/neraca-saldo", neracaSaldoRouter);
router.use("/lpa", lpaRouter);
router.use("/sptj", sptjRouter);
router.use("/bapsd", bapsdRouter);
if (kebutuhanBelanjaRouter.bahanRouter) {
  router.use("/kebutuhan-belanja-bahan", kebutuhanBelanjaRouter.bahanRouter);
}
router.use("/kebutuhan-belanja", kebutuhanBelanjaRouter);
router.use("/per-periode", perPeriodeRouter);
router.use("/per-bulan", perBulanRouter);
router.use("/stock-barang", stockBarangRouter);
router.use("/ringkasan-anggaran", ringkasanAnggaranRouter);
router.use("/harian", harianRouter);
router.use("/lra", lraRouter);
router.use("/lpd2m", lpd2mRouter);
router.use("/btt", bttRouter);
router.use("/lbbp", lbbpRouter);
router.use("/bkk", bkkRouter);

module.exports = router;
