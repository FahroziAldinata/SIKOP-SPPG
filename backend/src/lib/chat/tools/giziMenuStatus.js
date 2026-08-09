'use strict';

// =============================================================================
// Tool Registry v1 — gizi-menu-status
// =============================================================================
// Fungsi:
//   cekStatusMenuHarian({ tanggal })  → status menu harian untuk tanggal
//   hitungMenuPending()               → jumlah menu dengan status DIAJUKAN
//
// KEAMANAN:
//   - Tidak ada SQL mentah / query dinamis dari input user.
//   - Semua parameter divalidasi Zod sebelum dioperasikan.
//   - Authorization (requirePermission) dipanggil di titik pemanggilan (chat.js),
//     BUKAN di sini — supaya fungsi ini testable secara independen.
// =============================================================================

const { z } = require('zod');
const prisma = require('../../prisma');

// ---------------------------------------------------------------------------
// Skema validasi parameter
// ---------------------------------------------------------------------------

const cekStatusMenuHarianSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
});

// ---------------------------------------------------------------------------
// cek_status_menu_harian({ tanggal })
// ---------------------------------------------------------------------------
// Cek apakah MenuHarian sudah ada untuk tanggal yang diberikan dan
// mengembalikan statusnya.
//
// Return:
//   { status: 'belum_diisi' }                         — row tidak ada
//   { status: 'DRAFT'|'DIAJUKAN'|'DISETUJUI'|'DITOLAK', tanggal, id }
// ---------------------------------------------------------------------------

async function cekStatusMenuHarian(params) {
  const parsed = cekStatusMenuHarianSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error(`Parameter tidak valid: ${parsed.error.issues[0].message}`);
  }

  const { tanggal } = parsed.data;
  const tgl = new Date(tanggal);
  // Pastikan tanggal valid
  if (isNaN(tgl.getTime())) {
    throw new Error('Tanggal tidak valid');
  }

  const menu = await prisma.menuHarian.findFirst({
    where: { tanggal: tgl },
    select: { id: true, status: true, tanggal: true, periodeId: true }
  });

  if (!menu) {
    return { status: 'belum_diisi', tanggal };
  }

  return {
    status: menu.status,   // DRAFT | DIAJUKAN | DISETUJUI | DITOLAK
    tanggal,
    id: menu.id,
    periodeId: menu.periodeId
  };
}

// ---------------------------------------------------------------------------
// hitung_menu_pending()
// ---------------------------------------------------------------------------
// Hitung jumlah MenuHarian yang berstatus DIAJUKAN (menunggu approval).
// ---------------------------------------------------------------------------

async function hitungMenuPending() {
  const jumlah = await prisma.menuHarian.count({
    where: { status: 'DIAJUKAN' }
  });

  return { jumlah, status: 'DIAJUKAN' };
}

// ---------------------------------------------------------------------------
// Definisi tool untuk function calling LLM (JSON Schema kompatibel OpenAI)
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'cek_status_menu_harian',
      description:
        'Cek status menu harian untuk tanggal tertentu. ' +
        'Mengembalikan: belum_diisi (belum dibuat), DRAFT, DIAJUKAN, DISETUJUI, atau DITOLAK.',
      parameters: {
        type: 'object',
        properties: {
          tanggal: {
            type: 'string',
            description: 'Tanggal dalam format YYYY-MM-DD, contoh: 2026-08-10'
          }
        },
        required: ['tanggal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'hitung_menu_pending',
      description:
        'Hitung jumlah menu harian yang berstatus DIAJUKAN (menunggu persetujuan Kepala SPPG).',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

const RESOURCE_KODE = 'gizi-menu-status';

module.exports = {
  RESOURCE_KODE,
  TOOL_DEFINITIONS,
  cekStatusMenuHarian,
  hitungMenuPending
};
