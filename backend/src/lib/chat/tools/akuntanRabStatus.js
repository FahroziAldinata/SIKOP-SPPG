'use strict';

// =============================================================================
// Tool Registry v1 — akuntan-rab-status
// =============================================================================
// Fungsi:
//   cekStatusRabHarian({ tanggal, periode_id? }) → status RAB harian (belum_dibuat/draft/diajukan/disetujui/ditolak)
//   hitungRabPending({ periode_id? })           → jumlah RabHarian berstatus DIAJUKAN
//
// KEAMANAN:
//   - Tidak ada SQL mentah / query dinamis dari input user.
//   - Semua parameter divalidasi Zod sebelum dioperasikan.
//   - Authorization (requirePermission) dipanggil di titik pemanggilan (chat.js),
//     BUKAN di sini — supaya fungsi ini testable secara independen.
// =============================================================================

const { z } = require('zod');
const prisma = require('../../prisma');

const cekStatusRabHarianSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  periode_id: z.string().optional()
});

const hitungRabPendingSchema = z.object({
  periode_id: z.string().optional()
});

async function cekStatusRabHarian(params) {
  const parsed = cekStatusRabHarianSchema.safeParse(params || {});
  if (!parsed.success) {
    throw new Error(`Parameter tidak valid: ${parsed.error.issues[0].message}`);
  }

  const { tanggal, periode_id } = parsed.data;
  const tgl = new Date(tanggal);
  if (isNaN(tgl.getTime())) {
    throw new Error('Tanggal tidak valid');
  }

  let rab;
  if (periode_id) {
    rab = await prisma.rabHarian.findUnique({
      where: {
        periodeId_tanggal: {
          periodeId: periode_id,
          tanggal: tgl
        }
      },
      select: { id: true, status: true, tanggal: true, periodeId: true }
    });
  } else {
    rab = await prisma.rabHarian.findFirst({
      where: { tanggal: tgl },
      select: { id: true, status: true, tanggal: true, periodeId: true }
    });
  }

  if (!rab) {
    return { status: 'belum_dibuat', tanggal };
  }

  const statusMap = {
    DRAFT: 'draft',
    DIAJUKAN: 'diajukan',
    DISETUJUI: 'disetujui',
    DITOLAK: 'ditolak'
  };

  return {
    status: statusMap[rab.status] || rab.status.toLowerCase(),
    tanggal,
    id: rab.id,
    periodeId: rab.periodeId
  };
}

async function hitungRabPending(params) {
  const parsed = hitungRabPendingSchema.safeParse(params || {});
  if (!parsed.success) {
    throw new Error(`Parameter tidak valid: ${parsed.error.issues[0].message}`);
  }

  const { periode_id } = parsed.data;
  const where = { status: 'DIAJUKAN' };
  if (periode_id) {
    where.periodeId = periode_id;
  }

  const jumlah = await prisma.rabHarian.count({ where });

  return { jumlah, status: 'DIAJUKAN' };
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'cek_status_rab_harian',
      description:
        'Cek status RAB harian untuk tanggal tertentu. ' +
        'Mengembalikan: belum_dibuat, draft, diajukan, disetujui, atau ditolak.',
      parameters: {
        type: 'object',
        properties: {
          tanggal: {
            type: 'string',
            description: 'Tanggal dalam format YYYY-MM-DD, contoh: 2026-08-10'
          },
          periode_id: {
            type: 'string',
            description: 'ID periode (opsional)'
          }
        },
        required: ['tanggal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'hitung_rab_pending',
      description:
        'Hitung jumlah RAB harian yang berstatus DIAJUKAN (menunggu approval Kepala SPPG).',
      parameters: {
        type: 'object',
        properties: {
          periode_id: {
            type: 'string',
            description: 'ID periode (opsional)'
          }
        },
        required: []
      }
    }
  }
];

const RESOURCE_KODE = 'akuntan-rab-status';

module.exports = {
  RESOURCE_KODE,
  TOOL_DEFINITIONS,
  cekStatusRabHarian,
  hitungRabPending
};
