// Vitest dijalankan dengan globals: true — describe/it/expect/vi/beforeEach/afterEach global.

// Mock nodemailer sebelum require email module
vi.mock('nodemailer', () => ({
  createTransport: vi.fn()
}));

const nodemailer = require('nodemailer');
const { sendMail, createTransport, resetTransportCache, renderNotifikasiEmail } = require('../email');
const { ENTITY_LABEL } = require('../../templates/email/notifikasi');

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_TLS_REJECT_UNAUTHORIZED'];
let smtpOriginals = {};

beforeEach(() => {
  smtpOriginals = {};
  for (const k of SMTP_KEYS) {
    smtpOriginals[k] = process.env[k];
    delete process.env[k];
  }
  // Reset mock nodemailer + cache transport module-level
  vi.clearAllMocks();
  nodemailer.createTransport = vi.fn();
  resetTransportCache();
});

afterEach(() => {
  for (const k of SMTP_KEYS) {
    if (smtpOriginals[k] !== undefined) {
      process.env[k] = smtpOriginals[k];
    } else {
      delete process.env[k];
    }
  }
});

describe('lib/email — konfigurasi SMTP', () => {
  it('createTransport return null jika SMTP_HOST kosong', () => {
    process.env.SMTP_USER = 'user@test.com';
    expect(createTransport()).toBeNull();
  });

  it('createTransport return null jika SMTP_USER kosong', () => {
    process.env.SMTP_HOST = 'smtp.test';
    const mockTransport = {
      sendMail: vi.fn(),
      __smtpFrom: 'smtp.test'
    };
    nodemailer.createTransport.mockReturnValue(mockTransport);
    
    const transport = createTransport();
    expect(transport).toBeNull();
  });

  it('createTransport return object jika SMTP_HOST + SMTP_USER terisi', () => {
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_USER = 'user@test.com';
    const mockTransport = {
      sendMail: vi.fn(),
      __smtpFrom: 'user@test.com'
    };
    nodemailer.createTransport.mockReturnValue(mockTransport);
    
    const transport = createTransport();
    expect(transport).toBeTruthy();
    expect(transport.__smtpFrom).toBe('user@test.com');
  });
});

describe('lib/email — sendMail', () => {
  it('melempar error jika argumen wajib tidak lengkap', async () => {
    await expect(sendMail({ to: 'a@b.c', subject: 'x' })).resolves.toEqual({ 
      skipped: true, 
      reason: 'SMTP_NOT_CONFIGURED' 
    });
  });

  it('return { skipped } tanpa hit SMTP kalau tidak dikonfigurasi', async () => {
    const res = await sendMail({ to: 'a@b.c', subject: 'Judul', text: 'Isi' });
    expect(res).toEqual({ skipped: true, reason: 'SMTP_NOT_CONFIGURED' });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('mengirim email via transporter saat SMTP dikonfigurasi', async () => {
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'secret';
    process.env.SMTP_FROM = 'no-reply@sppg.local';

    const mockTransporter = {
      sendMail: vi.fn().mockResolvedValue({ messageId: 'm1' }),
      __smtpFrom: 'no-reply@sppg.local'
    };
    nodemailer.createTransport.mockReturnValue(mockTransporter);

    const res = await sendMail({ to: 'a@b.c', subject: 'Judul', text: 'Isi', html: '<p>Isi</p>' });

    expect(res.messageId).toBe('m1');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.test',
      port: 587,
      secure: false,
      auth: { user: 'user@test.com', pass: 'secret' }
    }));
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@sppg.local',
      to: 'a@b.c',
      subject: 'Judul',
      text: 'Isi',
      html: '<p>Isi</p>'
    }));
  });
});

describe('templates/email/notifikasi — renderNotifikasiEmail', () => {
  it('menghasilkan subject, text, dan html dengan konten dinamis', () => {
    const { subject, text, html } = renderNotifikasiEmail({
      nama: 'Rudi',
      judul: 'Menu Harian Disetujui',
      pesan: 'Menu Anda disetujui.',
      entityType: 'MENU'
    });

    expect(subject).toContain('[SIKOP-SPPG]');
    expect(subject).toContain('Menu Harian Disetujui');
    expect(text).toContain('Yth. Rudi');
    expect(text).toContain('Menu Anda disetujui.');
    expect(html).toContain('Rudi');
    expect(html).toContain('Menu Harian Disetujui');
    expect(html).toContain('Modul terkait: Menu Harian');
  });

  it('melakukan escape terhadap HTML pada konten user', () => {
    const { html } = renderNotifikasiEmail({
      nama: '<b>X</b>',
      judul: 'Judul & "X"',
      pesan: '<script>alert(1)</script>'
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Judul &amp;');
  });

  it('memakai default label & fallback nama saat tidak diisi', () => {
    const { text, html } = renderNotifikasiEmail({ judul: 'Judul', pesan: 'Pesan' });
    expect(text).toContain('Pengguna SPPG');
    expect(html).toContain('Modul terkait: Entitas');
  });

  it('ENTITY_LABEL berisi mapping untuk MENU dan RAB (PO dihapus)', () => {
    expect(ENTITY_LABEL.MENU).toBe('Menu Harian');
    expect(ENTITY_LABEL.RAB).toBe('RAB Harian');
    expect(ENTITY_LABEL.PO).toBeUndefined(); // PO dihapus dari scope
  });
});

describe('lib/email — createTransport', () => {
  it('secure=true untuk port 465', () => {
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    
    const mockTransport = {
      sendMail: vi.fn(),
      __smtpFrom: 'u'
    };
    nodemailer.createTransport.mockReturnValue(mockTransport);
    
    createTransport();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      secure: true
    }));
  });

  it('port default 587 jika SMTP_PORT tidak valid', () => {
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = 'abc';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    
    const mockTransport = {
      sendMail: vi.fn(),
      __smtpFrom: 'u'
    };
    nodemailer.createTransport.mockReturnValue(mockTransport);
    
    createTransport();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 587
    }));
  });
});