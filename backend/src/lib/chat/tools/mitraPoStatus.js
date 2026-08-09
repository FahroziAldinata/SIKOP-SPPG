'use strict';

// =============================================================================
// Tool Registry v1 — mitra-po-status
// =============================================================================
// Fungsi:
//   hitungPoPending({ status?, supplier_id? })           → integer count PO (default kec DITERIMA)
//   cekStatusPoSupplier({ supplier_id, tanggal_awal?, tanggal_akhir? }) → { total, diajukan, direalisasi, diterima }
//
// KEAMANAN:
//   - Tidak ada SQL mentah / query dinamis dari input user.
//   - Semua parameter divalidasi Zod sebelum dioperasikan.
//   - Authorization (requirePermission) dipanggil di titik pemanggilan (chat.js),
//     BUKAN di sini — supaya fungsi ini testable secara independen.
// =============================================================================

const { z } = require('zod');
const prisma = require('../../prisma');

const hitungPoPendingSchema = z.object({
  status: z.enum(['DIAJUKAN', 'DIREALISASI', 'DITERIMA']).optional(),
  supplier_id: z.string().optional()
});

const cekStatusPoSupplierSchema = z.object({
  supplier_id: z.string({ required_error: 'supplier_id wajib diisi' }).min(1, 'supplier_id wajib diisi'),
  tanggal_awal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal_awal harus YYYY-MM-DD').optional(),
  tanggal_akhir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal_akhir harus YYYY-MM-DD').optional()
});

async function hitungPoPending(params) {
  const parsed = hitungPoPendingSchema.safeParse(params || {});
  if (!parsed.success) {
    throw new Error(`Parameter tidak valid: ${parsed.error.issues[0].message}`);
  }

  const { status, supplier_id } = parsed.data;

  const where = {};
  if (status) {
    where.status = status;
  } else {
    // Default hitung semua kecuali DITERIMA (yaitu DIAJUKAN & DIREALISASI)
    where.status = { not: 'DITERIMA' };
  }

  if (supplier_id) {
    where.supplierId = supplier_id;
  }

  const jumlah = await prisma.transaksiPembelian.count({ where });

  return { jumlah, statusFilter: status || 'PENDING' };
}

async function cekStatusPoSupplier(params) {
  const parsed = cekStatusPoSupplierSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error(`Parameter tidak valid: ${parsed.error.issues[0].message}`);
  }

  const { supplier_id, tanggal_awal, tanggal_akhir } = parsed.data;

  const where = { supplierId: supplier_id };
  if (tanggal_awal || tanggal_akhir) {
    where.tanggal = {};
    if (tanggal_awal) where.tanggal.gte = new Date(tanggal_awal);
    if (tanggal_akhir) where.tanggal.lte = new Date(tanggal_akhir);
  }

  const grouped = await prisma.transaksiPembelian.groupBy({
    by: ['status'],
    _count: { _all: true },
    where
  });

  const result = {
    total: 0,
    diajukan: 0,
    direalisasi: 0,
    diterima: 0
  };

  for (const item of grouped) {
    const count = item._count._all;
    result.total += count;
    if (item.status === 'DIAJUKAN') result.diajukan = count;
    else if (item.status === 'DIREALISASI') result.direalisasi = count;
    else if (item.status === 'DITERIMA') result.diterima = count;
  }

  return result;
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'hitung_po_pending',
      description:
        'Hitung jumlah pesanan pembelian (PO) yang pending/proses. ' +
        'Dapat difilter berdasarkan status (DIAJUKAN/DIREALISASI/DITERIMA) dan supplier_id. ' +
        'Default menghitung semua PO kecuali yang berstatus DITERIMA.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['DIAJUKAN', 'DIREALISASI', 'DITERIMA'],
            description: 'Filter status PO (opsional)'
          },
          supplier_id: {
            type: 'string',
            description: 'ID supplier (opsional)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cek_status_po_supplier',
      description:
        'Cek ringkasan status PO untuk supplier tertentu. ' +
        'Mengembalikan jumlah total, diajukan, direalisasi, dan diterima.',
      parameters: {
        type: 'object',
        properties: {
          supplier_id: {
            type: 'string',
            description: 'ID supplier'
          },
          tanggal_awal: {
            type: 'string',
            description: 'Tanggal awal filter YYYY-MM-DD (opsional)'
          },
          tanggal_akhir: {
            type: 'string',
            description: 'Tanggal akhir filter YYYY-MM-DD (opsional)'
          }
        },
        required: ['supplier_id']
      }
    }
  }
];

const RESOURCE_KODE = 'mitra-po-status';

module.exports = {
  RESOURCE_KODE,
  TOOL_DEFINITIONS,
  hitungPoPending,
  cekStatusPoSupplier
};
