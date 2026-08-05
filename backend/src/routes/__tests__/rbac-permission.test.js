'use strict';

const {
  requirePermission,
  permissionCache,
  loadPermissionCache,
  invalidatePermissionCache
} = require('../../middleware/auth');

describe('Dynamic RBAC Foundation — middleware & cache', () => {
  beforeEach(() => {
    invalidatePermissionCache();
  });

  test('requirePermission: 401 bila req.user belum login', async () => {
    const middleware = requirePermission('JURNAL', 'READ');
    const req = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Belum login' });
    expect(next).not.toHaveBeenCalled();
  });

  test('requirePermission: role ADMIN superuser bypass -> next() dipanggil', async () => {
    const middleware = requirePermission('ANY_RESOURCE', 'DELETE');
    const req = { user: { role: 'ADMIN' } };
    const res = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('requirePermission: role non-ADMIN punya permission -> next() dipanggil', async () => {
    // Manually set permission cache for testing
    permissionCache.set('AKUNTAN', new Set(['JURNAL:READ']));

    const middleware = requirePermission('JURNAL', 'READ');
    const req = { user: { role: 'AKUNTAN' } };
    const res = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('requirePermission: role non-ADMIN tidak punya permission -> 403 error', async () => {
    permissionCache.set('AKUNTAN', new Set(['JURNAL:READ']));

    const middleware = requirePermission('JURNAL', 'DELETE');
    const req = { user: { role: 'AKUNTAN' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Anda tidak memiliki izin untuk mengakses resource ini'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('loadPermissionCache: memuat permission dari DB ke cache', async () => {
    const cache = await loadPermissionCache();
    expect(cache).toBeInstanceOf(Map);
  });

  test('invalidatePermissionCache: hapus key tertentu dan hapus seluruh cache bila tanpa argument', () => {
    permissionCache.set('ASLAP', new Set(['LAPORAN:READ', 'LAPORAN:CREATE']));

    invalidatePermissionCache('ASLAP:LAPORAN:READ');
    expect(permissionCache.get('ASLAP').has('LAPORAN:READ')).toBe(false);
    expect(permissionCache.get('ASLAP').has('LAPORAN:CREATE')).toBe(true);

    invalidatePermissionCache();
    expect(permissionCache.size).toBe(0);
  });
});
