const express = require("express");

const masterRouter = require("./master");
const grupHariRouter = require("./grupHari");
const penerimaManfaatRouter = require("./penerimaManfaat");
const sekolahKelasRouter = require("./sekolahKelas");
const laporanPerKelasRouter = require("./laporanPerKelas");
const laporanHarianRouter = require("./laporanHarian");
const laporanPeriodeRouter = require("./laporanPeriode");
const laporanBulananRouter = require("./laporanBulanan");
const laporanAggregateRouter = require("./laporanAggregate");
const poApproveRouter = require("./poApprove");

const router = express.Router();

router.use(masterRouter);
router.use(grupHariRouter);
router.use(penerimaManfaatRouter);
router.use(sekolahKelasRouter);
router.use(laporanPerKelasRouter);
router.use(laporanHarianRouter);
router.use(laporanPeriodeRouter);
router.use(laporanBulananRouter);
router.use(laporanAggregateRouter);
router.use(poApproveRouter);

module.exports = router;
