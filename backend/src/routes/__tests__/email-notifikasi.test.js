const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

// Mock nodemailer MANUAL lewat require.cache (bukan vi.mock) supaya pengiriman
// email bisa di-spy tanpa koneksi SMTP nyata. Alur sebenarnya: route ->
// emailHelper.queueEmailDispatch -> lib/email.sendMail -> createTransport() ->
// nodemailer.createTransport() -> transport.sendMail(...). Dengan menimpa entry
// cache modul 'nodemailer' SEBELUM `app` (yang menurunkan lib/email) di-require,
// lib/email menerima mock yang sama persis seperti vi.mock.
let sendMailSpy = vi.fn().mockResolvedValue({ messageId: 'm1' });

const nodemailerPath = require.resolve('nodemailer');
const mockNodemailer = {
  createTransport: vi.fn(() => ({
    sendMail: sendMailSpy,
    __smtpFrom: 'no-reply@sppg.test'
  }))
};

require.cache[nodemailerPath] = {
  id: nodemailerPath,
  filename: nodemailerPath,
  loaded: true,
  exports: mockNodemailer
};

const { app } = require('../../app');
const nodemailer = mockNodemailer;

describe('Email Notification (Fase 8) — Integrasi Trigger Approval (NO PO)', () => {
  const db = new PrismaClient();
  const headers = {};
  const ids = {};
  let periodeId;
  let dateCounter = 0;

  async function login(username) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${res.body.token}`
    };
  }

  async function getUnusedDate() {
    dateCounter += 1;
    for (let i = dateCounter; i < 500; i++) {
      const candidate = new Date(Date.UTC(2029, 0, i));
      const [existMenu, existRab] = await Promise.all([
        db.menuHarian.findFirst({ where: { periodeId, tanggal: candidate } }),
        db.rabHarian.findFirst({ where: { periodeId, tanggal: candidate } })
      ]);
      if (!existMenu && !existRab) {
        dateCounter = i;
        return candidate;
      }
    }
    return new Date(Date.UTC(2099, 0, 1));
  }

  async function waitForEmailSent(notifId) {
    for (let i = 0; i < 30; i++) {
      const n = await db.notifikasi.findUnique({ where: { id: notifId } });
      if (n && n.emailSent) return n;
      await new Promise((r) => setTimeout(r, 25));
    }
    return db.notifikasi.findUnique({ where: { id: notifId } });
  }

  async function cleanNotif(entityType, entityId) {
    await db.notifikasi.deleteMany({ where: { entityType, entityId } }).catch(() => {});
  }

  beforeAll(async () => {
    // Aktifkan jalur SMTP agar lib/email.createTransport() mengembalikan
    // transporter (return null kalau SMTP_HOST/SMTP_USER kosong).
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'no-reply@sppg.test';
    process.env.SMTP_PASS = 'secret';
    process.env.SMTP_FROM = 'no-reply@sppg.test';

    sendMailSpy = vi.fn().mockResolvedValue({ messageId: 'm1' });
    nodemailer.createTransport.mockReset().mockReturnValue({
      sendMail: sendMailSpy,
      __smtpFrom: 'no-reply@sppg.test'
    });

    headers.ahligizi = await login('ahligizi');
    headers.kepala = await login('kepalasppg');
    headers.akuntan = await login('akuntan');

    const periode = await db.periode.findFirst();
    expect(periode).toBeTruthy();
    periodeId = periode.id;

    ids.gizi = await db.user.findFirst({ where: { role: 'AHLI_GIZI' } });
    ids.kepala = await db.user.findFirst({ where: { role: 'KEPALA_SPPG' } });
    ids.akuntan = await db.user.findFirst({ where: { role: 'AKUNTAN' } });

    // Siapkan email untuk user penerima trigger supaya path email ikut teruji
    const emailMap = {
      [ids.kepala.id]: 'kepala@sppg.test',
      [ids.gizi.id]: 'gizi@sppg.test',
      [ids.akuntan.id]: 'akuntan@sppg.test'
    };
    for (const [uid, email] of Object.entries(emailMap)) {
      await db.user.update({ where: { id: uid }, data: { email } });
    }
  });

  afterAll(async () => {
    for (const u of [ids.kepala, ids.gizi, ids.akuntan]) {
      if (u) await db.user.update({ where: { id: u.id }, data: { email: null } }).catch(() => {});
    }
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
      delete process.env[k];
    }
    sendMailSpy = null;
    await db.$disconnect();
  });

  beforeEach(() => {
    sendMailSpy.mockClear().mockResolvedValue({ messageId: 'm1' });
  });

  describe('Menu Harian', () => {
    let menuId = null;

    afterEach(async () => {
      if (menuId) {
        await cleanNotif('MENU', menuId);
        await db.menuHarianBlok.deleteMany({ where: { menuHarianId: menuId } }).catch(() => {});
        await db.menuHarian.delete({ where: { id: menuId } }).catch(() => {});
        menuId = null;
      }
    });

    it('submit (DIAJUKAN) → notif + email ke KEPALA_SPPG', async () => {
      const menu = await db.menuHarian.create({ data: { periodeId, tanggal: await getUnusedDate(), status: 'DRAFT' } });
      menuId = menu.id;

      const res = await request(app)
        .put(`/api/gizi/menu-harian/${menu.id}`)
        .set(headers.ahligizi)
        .send({ status: 'DIAJUKAN' });
      expect(res.status).toBe(200);

      const notif = await db.notifikasi.findFirst({ where: { userId: ids.kepala.id, entityId: menu.id } });
      expect(notif).toBeTruthy();
      expect(notif.judul).toContain('Butuh Persetujuan');

      const final = await waitForEmailSent(notif.id);
      expect(final.emailSent).toBe(true);
      expect(final.emailError).toBeNull();
      expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'kepala@sppg.test' }));
    });

    it('approve (DISETUJUI) Kepala → notif + email ke AHLI_GIZI pembuat blok', async () => {
      const menu = await db.menuHarian.create({ data: { periodeId, tanggal: await getUnusedDate(), status: 'DIAJUKAN' } });
      menuId = menu.id;
      const kelompokUmur = await db.kelompokUmurMenu.findFirst();
      expect(kelompokUmur).toBeTruthy();
      await db.menuHarianBlok.create({
        data: { menuHarianId: menu.id, kelompokUmurMenuId: kelompokUmur.id, createdById: ids.gizi.id }
      });

      const res = await request(app)
        .post('/api/kepala/approval')
        .set(headers.kepala)
        .send({ menuHarianId: menu.id, status: 'DISETUJUI' });
      expect(res.status).toBe(201);

      const notif = await db.notifikasi.findFirst({ where: { userId: ids.gizi.id, entityId: menu.id } });
      expect(notif).toBeTruthy();
      expect(notif.judul).toContain('Disetujui');

      const final = await waitForEmailSent(notif.id);
      expect(final.emailSent).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'gizi@sppg.test' }));
    });

    it('reject (DITOLAK) Kepala → notif + email ke AHLI_GIZI', async () => {
      const menu = await db.menuHarian.create({ data: { periodeId, tanggal: await getUnusedDate(), status: 'DIAJUKAN' } });
      menuId = menu.id;
      const kelompokUmur = await db.kelompokUmurMenu.findFirst();
      await db.menuHarianBlok.create({
        data: { menuHarianId: menu.id, kelompokUmurMenuId: kelompokUmur.id, createdById: ids.gizi.id }
      });

      const res = await request(app)
        .post('/api/kepala/approval')
        .set(headers.kepala)
        .send({ menuHarianId: menu.id, status: 'DITOLAK', catatan: 'Perlu revisi porsi' });
      expect(res.status).toBe(201);

      const notif = await db.notifikasi.findFirst({ where: { userId: ids.gizi.id, entityId: menu.id } });
      expect(notif).toBeTruthy();
      expect(notif.judul).toContain('Ditolak');
      const final = await waitForEmailSent(notif.id);
      expect(final.emailSent).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'gizi@sppg.test' }));
    });
  });

  describe('RAB Harian', () => {
    let rabId = null;

    afterEach(async () => {
      if (rabId) {
        await cleanNotif('RAB', rabId);
        await db.approval.deleteMany({ where: { rabHarianId: rabId } }).catch(() => {});
        await db.rabHarian.delete({ where: { id: rabId } }).catch(() => {});
        rabId = null;
      }
    });

    it('submit (DIAJUKAN) → notif + email ke KEPALA_SPPG', async () => {
      const rab = await db.rabHarian.create({
        data: { periodeId, tanggal: await getUnusedDate(), status: 'DRAFT', createdById: ids.akuntan.id }
      });
      rabId = rab.id;

      const res = await request(app)
        .put(`/api/akuntan/rab-harian/${rab.id}`)
        .set(headers.akuntan)
        .send({ status: 'DIAJUKAN' });
      expect(res.status).toBe(200);

      const notif = await db.notifikasi.findFirst({ where: { userId: ids.kepala.id, entityId: rab.id } });
      expect(notif).toBeTruthy();
      expect(notif.judul).toContain('Butuh Persetujuan');
      const final = await waitForEmailSent(notif.id);
      expect(final.emailSent).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'kepala@sppg.test' }));
    });

    it('approve (DISETUJUI) → notif + email ke AKUNTAN pembuat RAB', async () => {
      const rab = await db.rabHarian.create({
        data: { periodeId, tanggal: await getUnusedDate(), status: 'DIAJUKAN', createdById: ids.akuntan.id }
      });
      rabId = rab.id;

      const res = await request(app)
        .post('/api/kepala/approval')
        .set(headers.kepala)
        .send({ rabHarianId: rab.id, status: 'DISETUJUI' });
      expect(res.status).toBe(201);

      const notif = await db.notifikasi.findFirst({ where: { userId: ids.akuntan.id, entityId: rab.id } });
      expect(notif).toBeTruthy();
      expect(notif.judul).toContain('Disetujui');
      const final = await waitForEmailSent(notif.id);
      expect(final.emailSent).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'akuntan@sppg.test' }));
    });

    it('reject (DITOLAK) → notif + email ke AKUNTAN pembuat RAB', async () => {
      const rab = await db.rabHarian.create({
        data: { periodeId, tanggal: await getUnusedDate(), status: 'DIAJUKAN', createdById: ids.akuntan.id }
      });
      rabId = rab.id;

      const res = await request(app)
        .post('/api/kepala/approval')
        .set(headers.kepala)
        .send({ rabHarianId: rab.id, status: 'DITOLAK', catatan: 'Anggaran tidak logis' });
      expect(res.status).toBe(201);

      const notif = await db.notifikasi.findFirst({ where: { userId: ids.akuntan.id, entityId: rab.id } });
      expect(notif).toBeTruthy();
      expect(notif.judul).toContain('Ditolak');
      const final = await waitForEmailSent(notif.id);
      expect(final.emailSent).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'akuntan@sppg.test' }));
    });
  });
});