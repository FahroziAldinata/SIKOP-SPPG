const assert = require("assert");
const baseUrl = "http://localhost:3000/api";

async function runGrupHariTests() {
  console.log("\n=== Testing GrupHari CRUD & Overlap Validation ===");

  const { PrismaClient } = require("@prisma/client");
  const prismaDb = new PrismaClient();

  // 1. Login as ASLAP
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "aslap",
      password: "ganti-password-ini"
    })
  });
  assert.strictEqual(loginRes.status, 200, "Login ASLAP should be 200 OK");
  const loginData = await loginRes.json();
  const token = loginData.token;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // 2. Create isolated test Periode
  const testPeriode = await prismaDb.periode.create({
    data: {
      tanggalMulai: new Date("2029-01-01"),
      tanggalSelesai: new Date("2029-01-31"),
      status: "AKTIF",
      anggaranAlokasi: 50000000
    }
  });

  try {
    // 3. Test POST /grup-hari (Group 1: SENIN-RABU)
    console.log("Running test: POST /grup-hari (Create Group 1)");
    const postRes1 = await fetch(`${baseUrl}/aslap/grup-hari`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        label: "GRUP A (SENIN-RABU)",
        hariAktif: ["SENIN", "SELASA", "RABU"]
      })
    });
    assert.strictEqual(postRes1.status, 201, "POST grup-hari 1 should return 201 Created");
    const group1 = await postRes1.json();
    assert.strictEqual(group1.label, "GRUP A (SENIN-RABU)");
    console.log("  PASSED");

    // 4. Test POST /grup-hari overlap validation (Group 2 overlaps with RABU)
    console.log("Running test: POST /grup-hari overlap validation");
    const postResOverlap = await fetch(`${baseUrl}/aslap/grup-hari`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        label: "GRUP B (RABU-KAMIS)",
        hariAktif: ["RABU", "KAMIS"]
      })
    });
    assert.strictEqual(postResOverlap.status, 400, "POST overlapping group should return 400 Bad Request");
    const overlapErr = await postResOverlap.json();
    assert.ok(overlapErr.error.includes("bertabrakan"), "Error message should mention collision");
    console.log("  PASSED");

    // 5. Test POST /grup-hari non-overlapping (Group 2: KAMIS-JUMAT)
    console.log("Running test: POST /grup-hari non-overlapping (Create Group 2)");
    const postRes2 = await fetch(`${baseUrl}/aslap/grup-hari`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId: testPeriode.id,
        label: "GRUP B (KAMIS-JUMAT)",
        hariAktif: ["KAMIS", "JUMAT"]
      })
    });
    assert.strictEqual(postRes2.status, 201, "POST non-overlapping group 2 should return 201 Created");
    const group2 = await postRes2.json();
    console.log("  PASSED");

    // 6. Test GET /grup-hari?periodeId=X
    console.log("Running test: GET /grup-hari?periodeId=X");
    const getRes = await fetch(`${baseUrl}/aslap/grup-hari?periodeId=${testPeriode.id}`, {
      headers
    });
    assert.strictEqual(getRes.status, 200, "GET grup-hari should return 200 OK");
    const groupList = await getRes.json();
    assert.strictEqual(groupList.length, 2, "Should return 2 groups for test period");
    console.log("  PASSED");

    // 7. Test PUT /grup-hari/:id (Update Group 2 label and hariAktif)
    console.log("Running test: PUT /grup-hari/:id");
    const putRes = await fetch(`${baseUrl}/aslap/grup-hari/${group2.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        label: "GRUP B (KAMIS-SABTU)",
        hariAktif: ["KAMIS", "JUMAT", "SABTU"]
      })
    });
    assert.strictEqual(putRes.status, 200, "PUT grup-hari should return 200 OK");
    const updatedGroup2 = await putRes.json();
    assert.strictEqual(updatedGroup2.label, "GRUP B (KAMIS-SABTU)");
    console.log("  PASSED");

    // 8. Test DELETE /grup-hari/:id
    console.log("Running test: DELETE /grup-hari/:id");
    const delRes = await fetch(`${baseUrl}/aslap/grup-hari/${group1.id}`, {
      method: "DELETE",
      headers
    });
    assert.strictEqual(delRes.status, 200, "DELETE grup-hari should return 200 OK");
    console.log("  PASSED");

  } finally {
    await prismaDb.grupHari.deleteMany({ where: { periodeId: testPeriode.id } });
    await prismaDb.periode.delete({ where: { id: testPeriode.id } });
    await prismaDb.$disconnect();
  }
}

runGrupHariTests().catch(err => {
  console.error("GrupHari Test Failed:", err);
  process.exit(1);
});
