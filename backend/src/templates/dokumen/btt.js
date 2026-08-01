const { renderKopSurat, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Convert number to Indonesian words (terbilang)
 */
function numberToTerbilang(n) {
  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return angka[n];
  if (n < 20) return numberToTerbilang(n - 10) + ' Belas';
  if (n < 100) return numberToTerbilang(Math.floor(n / 10)) + ' Puluh ' + numberToTerbilang(n % 10);
  if (n < 200) return 'Seratus ' + numberToTerbilang(n - 100);
  if (n < 1000) return numberToTerbilang(Math.floor(n / 100)) + ' Ratus ' + numberToTerbilang(n % 100);
  if (n < 2000) return 'Seribu ' + numberToTerbilang(n - 1000);
  if (n < 1000000) return numberToTerbilang(Math.floor(n / 1000)) + ' Ribu ' + numberToTerbilang(n % 1000);
  if (n < 1000000000) return numberToTerbilang(Math.floor(n / 1000000)) + ' Juta ' + numberToTerbilang(n % 1000000);
  if (n < 1000000000000) return numberToTerbilang(Math.floor(n / 1000000000)) + ' Milyar ' + numberToTerbilang(n % 1000000000);
  return '';
}

function formatTerbilang(nominal) {
  const n = Math.round(Math.abs(Number(nominal)));
  if (n === 0) return 'Nol Rupiah';
  return numberToTerbilang(n).trim().replace(/\s+/g, ' ') + ' Rupiah';
}

function renderBttHtml(data = {}) {
  const {
    nomorDokumen = '',
    nominal = 0,
    terbilang = '',
    keperluan = '',
    identitas = {},
    mitraNama = '',
    stafPengawasNama = '',
    kepalaNama = '',
    tempat = 'Sumedang',
    tanggal = '',
    kategori = 'operasional'
  } = data;

  const { namaLembaga = '', alamat = '', idSppg = '' } = identitas;
  const terbilangStr = terbilang || formatTerbilang(nominal);
  const labelKeperluan = kategori === 'sewa'
    ? `Uang Sewa ${keperluan}`
    : `${keperluan} meliputi, kebutuhan operasional kantor, gaji relawan, dll`;

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>BTT — ${nomorDokumen}</title><style>${SHARED_CSS}
    body{font-size:10pt;font-family:'Times New Roman',serif;padding:20px 30px;}
    .btt-title{text-align:center;font-size:14pt;font-weight:700;margin-bottom:4px;}
    .btt-nomor{text-align:center;font-size:11pt;margin-bottom:20px;}
    .btt-field{margin:6px 0;}
    .btt-field td{padding:3px 8px;vertical-align:top;}
    .btt-nominal-box{margin:10px 0;padding:8px;text-align:center;font-weight:700;font-size:12pt;}
    .ttd-section{margin-top:30px;}
    .ttd-table{width:100%;}
    .ttd-table td{width:50%;vertical-align:top;padding:4px;text-align:center;}
    .materai{text-align:left;padding-left:15%;font-size:9pt;margin:10px 0;}
    hr{ border: 0; border-top: 1px solid #000; }
  </style></head><body>
    <div class="btt-title">BUKTI TANDA TERIMA</div>
    <div class="btt-nomor">Nomor : ${escapeHtml(nomorDokumen)}</div>

    <table class="btt-field">
      <tr><td style="width:160px;">SUDAH TERIMA DARI</td><td style="width:20px;">:</td><td>Badan Gizi Nasional</td></tr>
      <tr><td>UANG SEBESAR</td><td>:</td><td>${escapeHtml(terbilangStr)}</td></tr>
      <tr><td></td><td>:</td><td>Rp ${formatNumberTabel(nominal)}</td></tr>
      <tr><td>UNTUK KEPERLUAN</td><td>:</td><td>${escapeHtml(labelKeperluan)}</td></tr>
      <tr><td></td><td></td><td>ID SPPG : ${escapeHtml(idSppg || '—')}</td></tr>
    </table>

    <div style="text-align:right;margin:20px 0 10px;">${escapeHtml(tempat)}, ${escapeHtml(tanggal)}</div>

    <table class="ttd-table">
      <tr>
        <td><strong>Yang Menerima,</strong></td>
        <td><strong>Mengetahui,</strong></td>
      </tr>
      <tr>
        <td style="font-size:9pt;">${escapeHtml(namaLembaga)}</td>
        <td style="font-size:9pt;">Kepala SPPG ${escapeHtml(namaLembaga)}<br><div class="materai">materai 10.000</div></td>
      </tr>
      <tr>
        <td style="padding-top:20px;font-weight:700;text-decoration:underline;">${escapeHtml(mitraNama || '—')}</td>
        <td style="padding-top:20px;font-weight:700;text-decoration:underline;">${escapeHtml(kepalaNama || '—')}</td>
      </tr>
      <tr>
        <td style="font-size:9pt;">Wakil Yayasan/Mitra</td>
        <td style="font-size:9pt;"></td>
      </tr>
    </table>
  </body></html>`;
}

module.exports = { renderBttHtml, formatTerbilang };
