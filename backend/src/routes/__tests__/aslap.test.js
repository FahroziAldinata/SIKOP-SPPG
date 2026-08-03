const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('Validasi Silang InputPenerimaManfaatDetail vs SekolahKelasDetail Tests', () => {
  const prismaDb = new PrismaClient();
  let token;
  let headers;
  let testPeriode;
  let testSekolah;
  let testKategori;
  let createdSekolahKelasId;
  let createdPenerimaManfaatId;

  beforeAll(async () => {
    // 1. Authenticate as ASLAP
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'aslap', password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Create isolated Periode
    testPeriode = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date('2028-01-01'),
        tanggalSelesai: new Date('2028-01-31'),
        status: 'AKTIF',
        anggaranAlokasi: 100000000
      }
    });

    // 3. Create test Sekolah and Kategori
    testSekolah = await prismaDb.sekolah.create({
      data: {
        nama: `Sekolah Test Aslap ${Date.now()}`,
        jenjang: 'SD'
      }
    });

    testKategori = await prismaDb.kategoriPenerima.findFirst({
      where: { kode: 'SD_1_3' }
    });
    expect(testKategori).toBeTruthy();
  });

  afterAll(async () => {
    if (createdPenerimaManfaatId) {
      try { await prismaDb.inputPenerimaManfaat.delete({ where: { id: createdPenerimaManfaatId } }); } catch {}
    }
    if (createdSekolahKelasId) {
      try { await prismaDb.sekolahKelasDetail.delete({ where: { id: createdSekolahKelasId } }); } catch {}
    }
    if (testSekolah) {
      try { await prismaDb.sekolah.delete({ where: { id: testSekolah.id } }); } catch {}
    }
    if (testPeriode) {
      try { await prismaDb.periode.delete({ where: { id: testPeriode.id } }); } catch {}
    }
    await prismaDb.$disconnect();
  });

  test('POST /api/aslap/sekolah-kelas-detail & POST /api/aslap/penerima-manfaat dengan validasi silang sukses', async () => {
    // SekolahKelasDetail (total 50)
    const skdRes = await request(app)
      .post('/api/aslap/sekolah-kelas-detail')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        sekolahId: testSekolah.id,
        namaKelas: 'Kelas 1',
        jumlah: 50
      });

    expect(skdRes.status).toBe(201);
    createdSekolahKelasId = skdRes.body.id;

    // POST penerima-manfaat (total 50)
    const pmRes = await request(app)
      .post('/api/aslap/penerima-manfaat')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        hariAktif: ['SENIN'],
        detail: [
          {
            kategoriId: testKategori.id,
            sekolahId: testSekolah.id,
            lakiLaki: 25,
            perempuan: 25
          }
        ]
      });

    expect(pmRes.status).toBe(201);
    createdPenerimaManfaatId = pmRes.body.id;
    expect(createdPenerimaManfaatId).toBeTruthy();
  });

  test('POST /api/aslap/penerima-manfaat dengan validasi silang gagal', async () => {
    const pmRes = await request(app)
      .post('/api/aslap/penerima-manfaat')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        hariAktif: ['SELASA'],
        detail: [
          {
            kategoriId: testKategori.id,
            sekolahId: testSekolah.id,
            lakiLaki: 30,
            perempuan: 30
          }
        ]
      });

    expect(pmRes.status).toBe(400);
    expect(pmRes.body.error).toBe('VALIDASI_SILANG');
    expect(pmRes.body.message).toBe('Validasi silang gagal: total penerima tidak cocok dengan jumlah kelas');
    expect(Array.isArray(pmRes.body.details)).toBe(true);
    expect(pmRes.body.details[0].total_penerima).toBe(60);
    expect(pmRes.body.details[0].total_kelas).toBe(50);
    expect(pmRes.body.details[0].selisih).toBe(10);
  });

  test('POST /api/aslap/sekolah-kelas-detail dengan validasi silang balik gagal', async () => {
    const skdRes = await request(app)
      .post('/api/aslap/sekolah-kelas-detail')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        sekolahId: testSekolah.id,
        namaKelas: 'Kelas 2',
        jumlah: 20
      });

    expect(skdRes.status).toBe(400);
    expect(skdRes.body.error).toBe('VALIDASI_SILANG_BALIK');
    expect(skdRes.body.message).toBe('Validasi silang gagal: jumlah kelas tidak cocok dengan total penerima');
    expect(Array.isArray(skdRes.body.details)).toBe(true);
    expect(skdRes.body.details[0].total_penerima).toBe(50);
    expect(skdRes.body.details[0].total_kelas).toBe(70);
    expect(skdRes.body.details[0].selisih).toBe(20);
  });
});
