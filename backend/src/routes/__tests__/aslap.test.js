const assert = require("assert");
const baseUrl = "http://localhost:3000/api";

let describeFn = global.describe;
let testFn = global.test;

if (!describeFn || !testFn) {
  const tests = [];
  describeFn = (name, fn) => {
    console.log(`\n=== ${name} ===`);
    fn();
  };
  testFn = (name, fn) => {
    tests.push({ name, fn });
  };
  describeFn.runner = async () => {
    for (const t of tests) {
      console.log(`Running test: ${t.name}`);
      try {
        await t.fn();
        console.log(`  PASSED: ${t.name}`);
      } catch (err) {
        console.error(`  FAILED: ${t.name}`);
        throw err;
      }
    }
  };
}

describeFn("Validasi Silang InputPenerimaManfaatDetail vs SekolahKelasDetail", () => {
  const { PrismaClient } = require("@prisma/client");
  const prismaDb = new PrismaClient();

  let token = null;
  let headers = {};
  let testPeriode = null;
  let testSekolah = null;
  let testKategori = null;
  let createdSekolahKelasId = null;
  let createdPenerimaManfaatId = null;

  testFn("POST /penerima-manfaat dengan validasi silang sukses", async () => {
    // 1. Authenticate as ASLAP
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "aslap",
        password: "ganti-password-ini"
      })
    });
    assert.strictEqual(loginRes.status, 200, "Login ASLAP harus 200 OK");
    const loginData = await loginRes.json();
    token = loginData.token;
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    // 2. Create a clean isolated Periode for test
    testPeriode = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date("2028-01-01"),
        tanggalSelesai: new Date("2028-01-31"),
        status: "AKTIF",
        anggaranAlokasi: 100000000
      }
    });

    // 3. Create test Sekolah and Kategori
    testSekolah = await prismaDb.sekolah.create({
      data: {
        nama: `Sekolah Test Aslap ${Date.now()}`,
        jenjang: "SD"
      }
    });

    testKategori = await prismaDb.kategoriPenerima.findFirst({
      where: { kode: "SD_1_3" }
    });
    assert.ok(testKategori, "Kategori SD_1_3 harus ada di DB");

    // 4. Create SekolahKelasDetail (total 50)
    const skdRes = await fetch(`${baseUrl}/aslap/sekolah-kelas-detail`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        sekolahId: testSekolah.id,
        namaKelas: "Kelas 1",
        jumlah: 50
      })
    });
    assert.strictEqual(skdRes.status, 201, "POST sekolah-kelas-detail harus 201 Created");
    const skdData = await skdRes.json();
    createdSekolahKelasId = skdData.id;

    // 5. POST penerima-manfaat dengan total penerima 50 (cocok dengan total kelas 50)
    const pmRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        hariAktif: ["SENIN"],
        detail: [
          {
            kategoriId: testKategori.id,
            sekolahId: testSekolah.id,
            lakiLaki: 25,
            perempuan: 25
          }
        ]
      })
    });

    const pmData = await pmRes.json();
    if (pmRes.status !== 201) {
      console.error("POST penerima-manfaat failed with response:", pmData);
    }
    assert.strictEqual(pmRes.status, 201, "POST penerima-manfaat cocok harus 201 Created");
    createdPenerimaManfaatId = pmData.id;
    assert.ok(createdPenerimaManfaatId, "Penerima manfaat ID harus terbuat");
  });

  testFn("POST /penerima-manfaat dengan validasi silang gagal", async () => {
    // Attempt POST penerima-manfaat dengan total 60 (tidak cocok dengan total kelas 50)
    const pmRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        hariAktif: ["SELASA"],
        detail: [
          {
            kategoriId: testKategori.id,
            sekolahId: testSekolah.id,
            lakiLaki: 30,
            perempuan: 30
          }
        ]
      })
    });

    const pmData = await pmRes.json();
    assert.strictEqual(pmRes.status, 400, "POST penerima-manfaat tidak cocok harus error 400");
    assert.strictEqual(pmData.error, "VALIDASI_SILANG");
    assert.strictEqual(pmData.message, "Validasi silang gagal: total penerima tidak cocok dengan jumlah kelas");
    assert.ok(Array.isArray(pmData.details) && pmData.details.length > 0, "Details harus berupa array");
    const detailError = pmData.details[0];
    assert.strictEqual(detailError.total_penerima, 60);
    assert.strictEqual(detailError.total_kelas, 50);
    assert.strictEqual(detailError.selisih, 10);
  });

  testFn("POST /sekolah-kelas-detail dengan validasi silang balik gagal", async () => {
    // Attempt POST sekolah-kelas-detail baru (jumlah 20) sehingga total kelas = 50 + 20 = 70,
    // yang tidak cocok dengan total penerima (50)
    const skdRes = await fetch(`${baseUrl}/aslap/sekolah-kelas-detail`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        sekolahId: testSekolah.id,
        namaKelas: "Kelas 2",
        jumlah: 20
      })
    });

    const skdData = await skdRes.json();
    assert.strictEqual(skdRes.status, 400, "POST sekolah-kelas-detail tidak cocok harus error 400");
    assert.strictEqual(skdData.error, "VALIDASI_SILANG_BALIK");
    assert.strictEqual(skdData.message, "Validasi silang gagal: jumlah kelas tidak cocok dengan total penerima");
    assert.ok(Array.isArray(skdData.details) && skdData.details.length > 0, "Details harus berupa array");
    const detailError = skdData.details[0];
    assert.strictEqual(detailError.total_penerima, 50);
    assert.strictEqual(detailError.total_kelas, 70);
    assert.strictEqual(detailError.selisih, 20);

    // Clean up temporary test data
    if (createdPenerimaManfaatId) {
      try {
        await prismaDb.inputPenerimaManfaat.delete({ where: { id: createdPenerimaManfaatId } });
      } catch (e) {}
    }
    if (createdSekolahKelasId) {
      try {
        await prismaDb.sekolahKelasDetail.delete({ where: { id: createdSekolahKelasId } });
      } catch (e) {}
    }
    if (testSekolah) {
      try {
        await prismaDb.sekolah.delete({ where: { id: testSekolah.id } });
      } catch (e) {}
    }
    if (testPeriode) {
      try {
        await prismaDb.periode.delete({ where: { id: testPeriode.id } });
      } catch (e) {}
    }
    await prismaDb.$disconnect();
  });
});

if (require.main === module && describeFn.runner) {
  describeFn.runner().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
