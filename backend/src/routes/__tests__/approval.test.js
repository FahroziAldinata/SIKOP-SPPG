const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('Approval Module Integration Tests', () => {
  const prismaDb = new PrismaClient();
  let giziHeaders;
  let kepalaHeaders;
  let periode;
  let periodeId;
  let userAkuntan;
  let userKepala;

  async function getUnusedDate(offset = 1) {
    for (let i = offset; i < 500; i++) {
      const candidate = new Date(Date.UTC(2027, 0, i));
      const exist = await prismaDb.menuHarian.findFirst({
        where: { periodeId, tanggal: candidate }
      });
      const existRab = await prismaDb.rabHarian.findFirst({
        where: { periodeId, tanggal: candidate }
      });
      if (!exist && !existRab) return candidate;
    }
    return new Date(Date.UTC(2099, 0, offset));
  }

  beforeAll(async () => {
    // Login Ahli Gizi
    const loginGizi = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ahligizi', password: TEST_PASSWORD });
    expect(loginGizi.status).toBe(200);
    giziHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginGizi.body.token}`
    };

    // Login Kepala SPPG
    const loginKepala = await request(app)
      .post('/api/auth/login')
      .send({ username: 'kepalasppg', password: TEST_PASSWORD });
    expect(loginKepala.status).toBe(200);
    kepalaHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginKepala.body.token}`
    };

    periode = await prismaDb.periode.findFirst();
    expect(periode).toBeTruthy();
    periodeId = periode.id;

    userAkuntan = await prismaDb.user.findFirst({ where: { role: 'AKUNTAN' } });
    userKepala = await prismaDb.user.findFirst({ where: { role: 'KEPALA_SPPG' } });
  });

  afterAll(async () => {
    await prismaDb.$disconnect();
  });

  describe('PUT Menu Harian Status & Security Tests', () => {
    let menu1Id = null;
    let menu2Id = null;
    let dateStr2;
    let dateStr3;

    beforeAll(async () => {
      const d1 = await getUnusedDate(10);
      const d2 = await getUnusedDate(11);
      const d3 = await getUnusedDate(12);
      dateStr2 = d2.toISOString().split('T')[0];
      dateStr3 = d3.toISOString().split('T')[0];

      const m1 = await prismaDb.menuHarian.create({
        data: { periodeId, tanggal: d1, status: 'DRAFT' }
      });
      menu1Id = m1.id;

      const m2 = await prismaDb.menuHarian.create({
        data: { periodeId, tanggal: d2, status: 'DRAFT' }
      });
      menu2Id = m2.id;
    });

    afterAll(async () => {
      if (menu1Id) { try { await prismaDb.menuHarian.delete({ where: { id: menu1Id } }); } catch {} }
      if (menu2Id) { try { await prismaDb.menuHarian.delete({ where: { id: menu2Id } }); } catch {} }
    });

    test('PUT status to DIAJUKAN (from DRAFT)', async () => {
      const res1 = await request(app)
        .put(`/api/gizi/menu-harian/${menu1Id}`)
        .set(giziHeaders)
        .send({ status: 'DIAJUKAN' });

      expect(res1.status).toBe(200);
      const updatedM1 = await prismaDb.menuHarian.findUnique({ where: { id: menu1Id } });
      expect(updatedM1.status).toBe('DIAJUKAN');
    });

    test('PUT when status is DIAJUKAN -> 400', async () => {
      const res2 = await request(app)
        .put(`/api/gizi/menu-harian/${menu1Id}`)
        .set(giziHeaders)
        .send({ tanggal: dateStr3 });

      expect(res2.status).toBe(400);
    });

    test('PUT when status is DISETUJUI -> 400', async () => {
      await prismaDb.menuHarian.update({
        where: { id: menu1Id },
        data: { status: 'DISETUJUI' }
      });

      const res3 = await request(app)
        .put(`/api/gizi/menu-harian/${menu1Id}`)
        .set(giziHeaders)
        .send({ tanggal: dateStr3 });

      expect(res3.status).toBe(400);

      // Reset to DRAFT
      await prismaDb.menuHarian.update({
        where: { id: menu1Id },
        data: { status: 'DRAFT' }
      });
    });

    test('PUT status="DISETUJUI" directly -> 400', async () => {
      const res4 = await request(app)
        .put(`/api/gizi/menu-harian/${menu1Id}`)
        .set(giziHeaders)
        .send({ status: 'DISETUJUI' });

      expect(res4.status).toBe(400);
    });

    test('PUT to duplicate date (P2002 conflict) -> 409', async () => {
      const res5 = await request(app)
        .put(`/api/gizi/menu-harian/${menu1Id}`)
        .set(giziHeaders)
        .send({ tanggal: dateStr2 });

      expect([400, 409]).toContain(res5.status);
    });
  });

  describe('POST Approval Concurrency & Validation Tests', () => {
    let testMenuId = null;

    beforeAll(async () => {
      const d1 = await getUnusedDate(20);
      const menu = await prismaDb.menuHarian.create({
        data: { periodeId, tanggal: d1, status: 'DRAFT' }
      });
      testMenuId = menu.id;
    });

    afterAll(async () => {
      if (testMenuId) {
        try { await prismaDb.approval.deleteMany({ where: { menuHarianId: testMenuId } }); } catch {}
        try { await prismaDb.menuHarian.delete({ where: { id: testMenuId } }); } catch {}
      }
    });

    test('POST with both menuHarianId and rabHarianId filled -> 400', async () => {
      const res = await request(app)
        .post('/api/kepala/approval')
        .set(kepalaHeaders)
        .send({
          menuHarianId: testMenuId,
          rabHarianId: 'dummy-rab-id',
          status: 'DISETUJUI'
        });

      expect(res.status).toBe(400);
    });

    test('POST to target with DRAFT status -> 400', async () => {
      const res = await request(app)
        .post('/api/kepala/approval')
        .set(kepalaHeaders)
        .send({
          menuHarianId: testMenuId,
          status: 'DISETUJUI'
        });

      expect(res.status).toBe(400);
    });

    test('POST DITOLAK without notes -> 400', async () => {
      await prismaDb.menuHarian.update({
        where: { id: testMenuId },
        data: { status: 'DIAJUKAN' }
      });

      const res = await request(app)
        .post('/api/kepala/approval')
        .set(kepalaHeaders)
        .send({
          menuHarianId: testMenuId,
          status: 'DITOLAK'
        });

      expect(res.status).toBe(400);
    });

    test('POST DITOLAK with whitespace-only notes -> 400', async () => {
      const res = await request(app)
        .post('/api/kepala/approval')
        .set(kepalaHeaders)
        .send({
          menuHarianId: testMenuId,
          status: 'DITOLAK',
          catatan: '   '
        });

      expect(res.status).toBe(400);
    });

    test('Concurrent POST approvals (row lock verification) -> Exactly one 201, one 400', async () => {
      const [cres1, cres2] = await Promise.all([
        request(app)
          .post('/api/kepala/approval')
          .set(kepalaHeaders)
          .send({ menuHarianId: testMenuId, status: 'DISETUJUI' }),
        request(app)
          .post('/api/kepala/approval')
          .set(kepalaHeaders)
          .send({ menuHarianId: testMenuId, status: 'DISETUJUI' })
      ]);

      const statusCodes = [cres1.status, cres2.status].sort((a, b) => a - b);
      expect(statusCodes).toEqual([201, 400]);

      const finalMenu = await prismaDb.menuHarian.findUnique({ where: { id: testMenuId } });
      expect(finalMenu.status).toBe('DISETUJUI');
    });
  });

  describe('POST Approval for RAB Harian Tests', () => {
    let testRabId = null;

    beforeAll(async () => {
      const d3 = await getUnusedDate(30);
      const rab = await prismaDb.rabHarian.create({
        data: {
          periodeId,
          tanggal: d3,
          status: 'DIAJUKAN',
          createdById: userAkuntan.id
        }
      });
      testRabId = rab.id;
    });

    afterAll(async () => {
      if (testRabId) {
        try { await prismaDb.approval.deleteMany({ where: { rabHarianId: testRabId } }); } catch {}
        try { await prismaDb.rabHarian.delete({ where: { id: testRabId } }); } catch {}
      }
    });

    test('POST approval DISETUJUI for RabHarian -> 201', async () => {
      const res = await request(app)
        .post('/api/kepala/approval')
        .set(kepalaHeaders)
        .send({
          rabHarianId: testRabId,
          status: 'DISETUJUI'
        });

      expect(res.status).toBe(201);
      const updatedRab = await prismaDb.rabHarian.findUnique({ where: { id: testRabId } });
      expect(updatedRab.status).toBe('DISETUJUI');
    });
  });

  describe('GET Approval History Tests', () => {
    let dummyMenu = null;
    let dummyRab = null;
    let approvalMenu = null;
    let approvalRab = null;

    beforeAll(async () => {
      const d1 = await getUnusedDate(40);
      const d2 = await getUnusedDate(41);
      dummyMenu = await prismaDb.menuHarian.create({
        data: { periodeId, tanggal: d1, status: 'DISETUJUI' }
      });
      dummyRab = await prismaDb.rabHarian.create({
        data: { periodeId, tanggal: d2, status: 'DITOLAK', createdById: userAkuntan.id }
      });
      approvalMenu = await prismaDb.approval.create({
        data: { menuHarianId: dummyMenu.id, status: 'DISETUJUI', catatan: 'Menu sehat disetujui', approvedById: userKepala.id }
      });
      approvalRab = await prismaDb.approval.create({
        data: { rabHarianId: dummyRab.id, status: 'DITOLAK', catatan: 'Anggaran tidak logis', approvedById: userKepala.id }
      });
    });

    afterAll(async () => {
      if (approvalMenu) { try { await prismaDb.approval.delete({ where: { id: approvalMenu.id } }); } catch {} }
      if (approvalRab) { try { await prismaDb.approval.delete({ where: { id: approvalRab.id } }); } catch {} }
      if (dummyMenu) { try { await prismaDb.menuHarian.delete({ where: { id: dummyMenu.id } }); } catch {} }
      if (dummyRab) { try { await prismaDb.rabHarian.delete({ where: { id: dummyRab.id } }); } catch {} }
    });

    test('GET approvals without periodeId -> 400', async () => {
      const res1 = await request(app)
        .get('/api/kepala/approval')
        .set(kepalaHeaders);

      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('periodeId');
    });

    test('GET approvals filtered by status=DISETUJUI', async () => {
      const res2 = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}&status=DISETUJUI`)
        .set(kepalaHeaders);

      expect(res2.status).toBe(200);
      expect(Array.isArray(res2.body.data)).toBe(true);
      const hasWrongStatus = res2.body.data.some(app => app.status !== 'DISETUJUI');
      expect(hasWrongStatus).toBe(false);
    });

    test('GET approvals filtered by targetType=MENU', async () => {
      const res3 = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}&targetType=MENU`)
        .set(kepalaHeaders);

      expect(res3.status).toBe(200);
      const hasWrongTarget = res3.body.data.some(app => app.menuHarianId === null || app.rabHarianId !== null);
      expect(hasWrongTarget).toBe(false);
    });

    test('GET approvals with non-KEPALA_SPPG role (AHLI_GIZI) -> 403', async () => {
      const res4 = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}`)
        .set(giziHeaders);

      expect(res4.status).toBe(403);
    });

    test('GET approvals filtered by status=DISETUJUI and targetType=MENU', async () => {
      const res5 = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}&status=DISETUJUI&targetType=MENU`)
        .set(kepalaHeaders);

      expect(res5.status).toBe(200);
      const hasWrongTargetOrStatus = res5.body.data.some(
        app => app.status !== 'DISETUJUI' || app.menuHarianId === null || app.rabHarianId !== null
      );
      expect(hasWrongTargetOrStatus).toBe(false);
    });

    test('GET approvals with invalid status or targetType -> 400', async () => {
      const res6a = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}&status=FOO`)
        .set(kepalaHeaders);
      expect(res6a.status).toBe(400);

      const res6b = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}&targetType=BAR`)
        .set(kepalaHeaders);
      expect(res6b.status).toBe(400);
    });
  });
});
