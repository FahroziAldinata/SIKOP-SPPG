'use strict';

// =============================================================================
// Tool Registry v1 — aslap-input-status
// =============================================================================
// Fungsi:
//   cekStatusInputPm({ periode_id }) → enum 'belum'|'sudah' via EXISTS InputPenerimaManfaat
//
// KEAMANAN:
//   - Tidak ada SQL mentah / query dinamis dari input user.
//   - Semua parameter divalidasi Zod sebelum dioperasikan.
//   - Authorization (requirePermission) dipanggil di titik pemanggilan (chat.js),
//     BUKAN di sini — supaya fungsi ini testable secara independen.
// =============================================================================

const { z } = require('zod');
const prisma = require('../../prisma');

const cekStatusInputPmSchema = z.object({
  periode_id: z.string({ required_error: 'periode_id wajib diisi' }).min(1, 'periode_id wajib diisi')
});

async function cekStatusInputPm(params) {
  const parsed = cekStatusInputPmSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error(`Parameter tidak valid: ${parsed.error.issues[0].message}`);
  }

  const { periode_id } = parsed.data;

  const existing = await prisma.inputPenerimaManfaat.findFirst({
    where: { periodeId: periode_id },
    select: { id: true }
  });

  return {
    status: existing ? 'sudah' : 'belum',
    periodeId: periode_id
  };
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'cek_status_input_pm',
      description:
        'Cek apakah input data penerima manfaat sudah diisi untuk periode tertentu. ' +
        'Mengembalikan: sudah atau belum.',
      parameters: {
        type: 'object',
        properties: {
          periode_id: {
            type: 'string',
            description: 'ID periode'
          }
        },
        required: ['periode_id']
      }
    }
  }
];

const RESOURCE_KODE = 'aslap-input-status';

module.exports = {
  RESOURCE_KODE,
  TOOL_DEFINITIONS,
  cekStatusInputPm
};
