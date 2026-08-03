/**
 * Route: Pemeriksaan Bahan Makanan (B.7)
 *
 * GET /api/laporan/pemeriksaan-bahan?poId=xxx[&nomorUrut=N]
 *   → JSON data pemeriksaan
 *
 * GET /api/laporan/pemeriksaan-bahan/pdf?poId=xxx[&nomorUrut=N]
 *   → PDF binary (application/pdf, inline)
 *
 * Auth: requireAuth + requireRole ASLAP, AKUNTAN, KEPALA_SPPG
 */
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { launchPuppeteer } = require('../lib/launchPuppeteer');
const { getPemeriksaanBahanData } = require('../lib/pemeriksaanBahanHelper');
const { renderPemeriksaanBahanHtml } = require('../templates/dokumen/pemeriksaanBahan');
const { injectTtdImages } = require('../templates/dokumen/shared');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validasi bahwa poId hadir dan tampak seperti CUID (non-empty string). */
function validatePoId(poId) {
  if (!poId || typeof poId !== 'string' || !poId.trim()) {
    return 'poId wajib disertakan pada query parameter';
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/laporan/pemeriksaan-bahan?poId=xxx
// ---------------------------------------------------------------------------
router.get(
  '/',
  requireAuth,
  requireRole('ASLAP', 'AKUNTAN', 'KEPALA_SPPG', 'MITRA'),
  async (req, res) => {
    try {
      const { poId, nomorUrut } = req.query;

      const validErr = validatePoId(poId);
      if (validErr) {
        return res.status(400).json({ success: false, error: validErr });
      }

      const nomorUrutNum = nomorUrut ? parseInt(nomorUrut, 10) : undefined;
      if (nomorUrut !== undefined && (isNaN(nomorUrutNum) || nomorUrutNum < 1)) {
        return res.status(400).json({
          success: false,
          error: 'nomorUrut harus berupa bilangan bulat positif',
        });
      }

      const data = await getPemeriksaanBahanData(poId.trim(), nomorUrutNum);

      return res.json({ success: true, data });
    } catch (error) {
      console.error('[pemeriksaan-bahan]', error);
      if (error.message?.startsWith('[NOT_FOUND]')) {
        return res.status(404).json({
          success: false,
          error: error.message.replace('[NOT_FOUND] ', ''),
        });
      }
      return res
        .status(500)
        .json({ success: false, error: 'Terjadi kesalahan server saat mengambil data pemeriksaan bahan' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/laporan/pemeriksaan-bahan/pdf?poId=xxx
// ---------------------------------------------------------------------------
router.get(
  '/pdf',
  requireAuth,
  requireRole('ASLAP', 'AKUNTAN', 'KEPALA_SPPG', 'MITRA'),
  async (req, res) => {
    let browser;
    try {
      const { poId, nomorUrut } = req.query;

      const validErr = validatePoId(poId);
      if (validErr) {
        return res.status(400).json({ success: false, error: validErr });
      }

      const nomorUrutNum = nomorUrut ? parseInt(nomorUrut, 10) : undefined;
      if (nomorUrut !== undefined && (isNaN(nomorUrutNum) || nomorUrutNum < 1)) {
        return res.status(400).json({
          success: false,
          error: 'nomorUrut harus berupa bilangan bulat positif',
        });
      }

      // 1. Ambil data
      const data = await getPemeriksaanBahanData(poId.trim(), nomorUrutNum);

      // 2. Render HTML
      const html = renderPemeriksaanBahanHtml(data);

      // 3. Generate PDF via puppeteer
      browser = await launchPuppeteer();
      const page = await browser.newPage();
      await page.setContent(await injectTtdImages(html), { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });

      // 4. Kirim binary
      const safeNomor = (data.nomorDokumen || 'pemeriksaan-bahan').replace(/[/\s]/g, '-');
      const buffer = Buffer.from(pdfBuffer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="PemeriksaanBahan-${safeNomor}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (error) {
      console.error('[pemeriksaan-bahan/pdf] Detail error:', error);
      if (error.message?.startsWith('[NOT_FOUND]')) {
        return res.status(404).json({
          success: false,
          error: error.message.replace('[NOT_FOUND] ', ''),
        });
      }
      return res
        .status(500)
        .json({
          success: false,
          error: 'Gagal membuat PDF Pemeriksaan Bahan',
          details: error.message,
        });
    } finally {
      if (browser) await browser.close();
    }
  }
);

module.exports = router;
