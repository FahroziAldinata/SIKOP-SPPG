'use strict';

const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');
const { seedRbacPermissions } = require('../../lib/rbacSeeder');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prisma = new PrismaClient();

describe('RBAC v2 Pruning & Source (SEED vs MANUAL)', () => {
  let adminToken;
  let manualGrantId;
  let staleGrantId;

  beforeAll(async () => {
    // Seed RBAC resources & permissions awal
    await seedRbacPermissions(prisma);

    // Login sebagai Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: TEST_PASSWORD });
    adminToken = adminLogin.body.token;
    expect(adminToken).toBeTruthy();
  });

  afterAll(async () => {
    // Cleanup grant yang dibuat test ini (by id)
    if (manualGrantId) {
      try {
        await prisma.rolePermission.delete({ where: { id: manualGrantId } });
      } catch {
        // ignore jika sudah terhapus
      }
    }
    if (staleGrantId) {
      try {
        await prisma.rolePermission.delete({ where: { id: staleGrantId } });
      } catch {
        // ignore jika sudah terhapus
      }
    }
    await prisma.$disconnect();
  });

  test('Skenario 1 (MANUAL dipertahankan): POST /api/admin/permissions -> 201 -> seedRbacPermissions -> grant MANUAL tetap ada', async () => {
    const res = await request(app)
      .post('/api/admin/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'AKUNTAN',
        resourceKode: 'akuntan-rab',
        aksi: 'APPROVE'
      });

    expect(res.status).toBe(201);
    manualGrantId = res.body.id;
    expect(res.body.source).toBe('MANUAL');

    // Panggil seeder RBAC
    await seedRbacPermissions(prisma);

    // Query DB: Grant AKUNTAN akuntan-rab APPROVE MASIH ADA + source = 'MANUAL'
    const grantInDb = await prisma.rolePermission.findUnique({
      where: { id: manualGrantId }
    });

    expect(grantInDb).not.toBeNull();
    expect(grantInDb.source).toBe('MANUAL');
  });

  test('Skenario 2 (SEED stale terhapus): insert prisma.rolePermission.create dengan source SEED -> seedRbacPermissions -> grant stale terhapus', async () => {
    const giziTargetRes = await prisma.resource.findUnique({
      where: { kode: 'gizi-target' }
    });
    expect(giziTargetRes).toBeTruthy();

    const createdStale = await prisma.rolePermission.create({
      data: {
        role: 'AKUNTAN',
        resourceId: giziTargetRes.id,
        aksi: 'READ',
        source: 'SEED'
      }
    });
    staleGrantId = createdStale.id;

    // Panggil seeder RBAC
    await seedRbacPermissions(prisma);

    // Query DB: Grant stale SEED terhapus oleh seeder
    const grantInDb = await prisma.rolePermission.findUnique({
      where: { id: staleGrantId }
    });

    expect(grantInDb).toBeNull();
  });
});
