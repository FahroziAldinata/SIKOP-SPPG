const express = require("express");

const masterRouter = require("./master");
const menuHarianRouter = require("./menuHarian");
const menuHarianBlokRouter = require("./menuHarianBlok");
const menuItemRouter = require("./menuItem");
const menuItemBahanRouter = require("./menuItemBahan");
const menuTargetGiziRouter = require("./menuTargetGizi");
const menuOrganoleptikRouter = require("./menuOrganoleptik");
const alergiCatatanRouter = require("./alergiCatatan");
const kendaraanRouter = require("./kendaraan");
const pengirimanRouter = require("./pengiriman");
const masterMenuRouter = require("./masterMenu");
const masterTargetGiziRouter = require("./masterTargetGizi");
const laporanPemenuhanRouter = require("./laporanPemenuhan");
const laporanRekapMenuRouter = require("./laporanRekapMenu");
const laporanOrganoleptikRouter = require("./laporanOrganoleptik");

const router = express.Router();

router.use(masterRouter);
router.use(menuHarianRouter);
router.use(menuHarianBlokRouter);
router.use(menuItemRouter);
router.use(menuItemBahanRouter);
router.use(menuTargetGiziRouter);
router.use(menuOrganoleptikRouter);
router.use(alergiCatatanRouter);
router.use(kendaraanRouter);
router.use(pengirimanRouter);
router.use(masterMenuRouter);
router.use(masterTargetGiziRouter);
router.use(laporanPemenuhanRouter);
router.use(laporanRekapMenuRouter);
router.use(laporanOrganoleptikRouter);

module.exports = router;
