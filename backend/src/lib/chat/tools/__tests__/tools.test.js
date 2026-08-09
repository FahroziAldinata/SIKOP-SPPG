'use strict';

// =============================================================================
// Unit Tests: Chatbot Tools (giziMenuStatus, akuntanRabStatus, mitraPoStatus, aslapInputStatus)
// =============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const giziMenu = require('../giziMenuStatus');
const akuntanRab = require('../akuntanRabStatus');
const mitraPo = require('../mitraPoStatus');
const aslapInput = require('../aslapInputStatus');
const toolsIndex = require('../index');

describe('Chatbot Tools Unit Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('giziMenuStatus', () => {
    test('cekStatusMenuHarian — throw pada tanggal invalid atau format salah', async () => {
      await expect(giziMenu.cekStatusMenuHarian({ tanggal: 'invalid-date' })).rejects.toThrow('Format tanggal');
    });

    test('cekStatusMenuHarian — return belum_diisi jika row tidak ada', async () => {
      const res = await giziMenu.cekStatusMenuHarian({ tanggal: '2099-12-31' });
      expect(res).toEqual({ status: 'belum_diisi', tanggal: '2099-12-31' });
    });

    test('hitungMenuPending — mengembalikan jumlah count integer', async () => {
      const res = await giziMenu.hitungMenuPending();
      expect(res).toHaveProperty('jumlah');
      expect(typeof res.jumlah).toBe('number');
      expect(res.status).toBe('DIAJUKAN');
    });
  });

  describe('akuntanRabStatus', () => {
    test('cekStatusRabHarian — throw pada tanggal invalid', async () => {
      await expect(akuntanRab.cekStatusRabHarian({ tanggal: '2026/08/10' })).rejects.toThrow('Format tanggal');
    });

    test('cekStatusRabHarian — return belum_dibuat jika row tidak ada', async () => {
      const res = await akuntanRab.cekStatusRabHarian({ tanggal: '2099-12-31' });
      expect(res).toEqual({ status: 'belum_dibuat', tanggal: '2099-12-31' });
    });

    test('hitungRabPending — mengembalikan count', async () => {
      const res = await akuntanRab.hitungRabPending({});
      expect(res).toHaveProperty('jumlah');
      expect(typeof res.jumlah).toBe('number');
      expect(res.status).toBe('DIAJUKAN');
    });
  });

  describe('mitraPoStatus', () => {
    test('hitungPoPending — default hitung semua kecuali DITERIMA', async () => {
      const res = await mitraPo.hitungPoPending({});
      expect(res).toHaveProperty('jumlah');
      expect(typeof res.jumlah).toBe('number');
    });

    test('cekStatusPoSupplier — throw jika supplier_id tidak diisi', async () => {
      await expect(mitraPo.cekStatusPoSupplier({})).rejects.toThrow('Parameter tidak valid');
    });

    test('cekStatusPoSupplier — return ringkasan total, diajukan, direalisasi, diterima', async () => {
      const res = await mitraPo.cekStatusPoSupplier({ supplier_id: 'non-existent-id' });
      expect(res).toEqual({
        total: 0,
        diajukan: 0,
        direalisasi: 0,
        diterima: 0
      });
    });
  });

  describe('aslapInputStatus', () => {
    test('cekStatusInputPm — throw jika periode_id kosong', async () => {
      await expect(aslapInput.cekStatusInputPm({ periode_id: '' })).rejects.toThrow('periode_id wajib diisi');
    });

    test('cekStatusInputPm — return belum jika periode tidak punya row InputPenerimaManfaat', async () => {
      const res = await aslapInput.cekStatusInputPm({ periode_id: 'non-existent-periode' });
      expect(res).toEqual({
        status: 'belum',
        periodeId: 'non-existent-periode'
      });
    });
  });

  describe('tools index registry', () => {
    test('ALL_TOOL_DEFINITIONS ter-export dan tiap item punya resourceStatus', () => {
      expect(Array.isArray(toolsIndex.ALL_TOOL_DEFINITIONS)).toBe(true);
      expect(toolsIndex.ALL_TOOL_DEFINITIONS.length).toBe(7);

      for (const toolDef of toolsIndex.ALL_TOOL_DEFINITIONS) {
        expect(toolDef).toHaveProperty('resourceStatus');
        expect(toolDef).toHaveProperty('type', 'function');
        expect(toolDef.function).toHaveProperty('name');
        expect(toolDef.function).toHaveProperty('description');
        expect(toolDef.function).toHaveProperty('parameters');
      }
    });

    test('RESOLVER_MAP berisi 7 fungsi tool dengan resourceStatus masing-masing', () => {
      const expectedTools = [
        'cek_status_menu_harian',
        'hitung_menu_pending',
        'cek_status_rab_harian',
        'hitung_rab_pending',
        'hitung_po_pending',
        'cek_status_po_supplier',
        'cek_status_input_pm'
      ];

      for (const toolName of expectedTools) {
        expect(toolsIndex.RESOLVER_MAP).toHaveProperty(toolName);
        expect(typeof toolsIndex.RESOLVER_MAP[toolName].fn).toBe('function');
        expect(typeof toolsIndex.RESOLVER_MAP[toolName].resourceStatus).toBe('string');
      }
    });
  });
});
