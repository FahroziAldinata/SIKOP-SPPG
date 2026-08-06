/**
 * screenshot-user-guide.js
 * Mengambil screenshot halaman user-guide per role menggunakan puppeteer-core.
 *
 * Jalankan dari root project (D:/Project/Sistem/Sistem_SPPG):
 *   node backend/scripts/screenshot-user-guide.js
 *
 * Env:
 *   PUPPETEER_EXECUTABLE_PATH  – path Chrome/Chromium (default: C:\Program Files\Google\Chrome\Application\chrome.exe)
 *
 * Output: docs/user-guide/screenshots/{ROLE}/{nama-menu}.png
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const BASE_FE = "http://localhost:5173";
const LOGIN_URL = `${BASE_FE}/login`;
const SCREENSHOT_ROOT = path.join(__dirname, "../../docs/user-guide/screenshots");
const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT = 20000; // ms per page
const WAIT_AFTER_NAV = 3000; // ms after navigation before screenshot

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// ---------------------------------------------------------------------------
// ROLE DEFINITIONS  (from user-guide draft v2 — verbatim)
// ---------------------------------------------------------------------------
const ROLES = [
  {
    role: "ASLAP",
    username: "aslap",
    password: "ganti-password-ini",
    menus: [
      { path: "/aslap",                   name: "aslap" },
      { path: "/aslap/sekolah",           name: "aslap-sekolah" },
      { path: "/aslap/penerima-manfaat",  name: "aslap-penerima-manfaat" },
      { path: "/aslap/po",                name: "aslap-po" },
      { path: "/aslap/laporan",           name: "aslap-laporan" },
    ],
  },
  {
    role: "MITRA",
    username: "mitra",
    password: "ganti-password-ini",
    menus: [
      { path: "/mitra",              name: "mitra" },
      { path: "/mitra/harga-bahan", name: "mitra-harga-bahan" },
      { path: "/mitra/po",          name: "mitra-po" },
      { path: "/mitra/kendaraan",   name: "mitra-kendaraan" },
      { path: "/mitra/laporan",     name: "mitra-laporan" },
      { path: "/audit-log",         name: "audit-log" },
    ],
  },
  {
    role: "AHLI_GIZI",
    username: "ahligizi",
    password: "ganti-password-ini",
    menus: [
      { path: "/gizi",              name: "gizi" },
      { path: "/gizi/menu-harian", name: "gizi-menu-harian" },
      { path: "/gizi/target-gizi", name: "gizi-target-gizi" },
      { path: "/gizi/laporan-gizi", name: "gizi-laporan-gizi" },
    ],
  },
  {
    role: "AKUNTAN",
    username: "akuntan",
    password: "ganti-password-ini",
    menus: [
      { path: "/akuntan",                       name: "akuntan" },
      { path: "/akuntan/laporan/periode-setup", name: "akuntan-laporan-periode-setup" },
      { path: "/akuntan/jurnal",                name: "akuntan-jurnal" },
      { path: "/akuntan/po",                    name: "akuntan-po" },
      { path: "/akuntan/anggaran-harian",       name: "akuntan-anggaran-harian" },
      { path: "/akuntan/dokumen-resmi",         name: "akuntan-dokumen-resmi" },
      { path: "/akuntan/nominatif-upah",        name: "akuntan-nominatif-upah" },
      { path: "/akuntan/saldo-awal-barang",     name: "akuntan-saldo-awal-barang" },
      { path: "/akuntan/mutasi-stok",           name: "akuntan-mutasi-stok" },
      { path: "/akuntan/validasi-stok",         name: "akuntan-validasi-stok" },
      { path: "/akuntan/laporan",               name: "akuntan-laporan" },
      { path: "/audit-log",                     name: "audit-log" },
    ],
  },
  {
    role: "KEPALA_SPPG",
    username: "kepalasppg",
    password: "ganti-password-ini",
    menus: [
      { path: "/kepala",          name: "kepala" },
      { path: "/kepala/approval", name: "kepala-approval" },
      { path: "/akuntan/laporan", name: "akuntan-laporan" },
    ],
  },
  {
    role: "ADMIN",
    username: "admin",
    password: "ganti-password-ini",
    menus: [
      { path: "/admin",               name: "admin" },
      { path: "/admin/users",         name: "admin-users" },
      { path: "/admin/permissions",   name: "admin-permissions" },
      { path: "/admin/laporan-bug",   name: "admin-laporan-bug" },
      { path: "/audit-log",           name: "audit-log" },
    ],
  },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugToFilename(slug) {
  return slug.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase() + ".png";
}

async function clearSession(page) {
  try {
    await page.goto(BASE_FE, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    });
    // Also clear all cookies
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");
    await client.detach();
  } catch (e) {
    console.error(`  [WARN] clearSession: ${e.message}`);
  }
}

async function loginRole(page, username, password) {
  console.log(`  → Navigating to login page...`);
  await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT });

  // Wait for login form
  await page.waitForSelector('input[type="text"], input[name="username"], input[id="username"]', {
    timeout: 10000,
  }).catch(() => {});

  // Fill username — try multiple selectors
  const usernameSelectors = [
    'input[name="username"]',
    'input[id="username"]',
    'input[placeholder*="sername"]',
    'input[placeholder*="ser"]',
    'input[type="text"]',
  ];
  let usernameField = null;
  for (const sel of usernameSelectors) {
    usernameField = await page.$(sel);
    if (usernameField) break;
  }
  if (!usernameField) throw new Error("Username field not found on login page");

  await usernameField.click({ clickCount: 3 });
  await usernameField.type(username, { delay: 30 });

  // Fill password
  const passwordSelectors = [
    'input[name="password"]',
    'input[id="password"]',
    'input[type="password"]',
  ];
  let passwordField = null;
  for (const sel of passwordSelectors) {
    passwordField = await page.$(sel);
    if (passwordField) break;
  }
  if (!passwordField) throw new Error("Password field not found on login page");

  await passwordField.click({ clickCount: 3 });
  await passwordField.type(password, { delay: 30 });

  // Submit
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:not([type])',
  ];
  let submitBtn = null;
  for (const sel of submitSelectors) {
    submitBtn = await page.$(sel);
    if (submitBtn) break;
  }
  if (!submitBtn) throw new Error("Submit button not found on login page");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: NAV_TIMEOUT }).catch(() => {}),
    submitBtn.click(),
  ]);

  // Confirm not on login page anymore
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    // Try pressing Enter as fallback
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
  }

  const finalUrl = page.url();
  if (finalUrl.includes("/login")) {
    throw new Error(`Login gagal: masih di ${finalUrl} setelah submit`);
  }
  console.log(`  → Login OK → ${finalUrl}`);
}

async function screenshotMenu(page, menuPath, outputPath) {
  const url = `${BASE_FE}${menuPath}`;
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT });
  } catch (e) {
    // Timeout on networkidle2 – try domcontentloaded
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    } catch (e2) {
      throw new Error(`goto failed: ${e2.message}`);
    }
  }

  // Wait for any primary content element
  const genericSelectors = ["nav", "main", "#root", ".app", "[data-testid]", "header", "aside", "section"];
  for (const sel of genericSelectors) {
    const el = await page.$(sel);
    if (el) {
      // Give it a bit extra to render data
      await new Promise((r) => setTimeout(r, WAIT_AFTER_NAV));
      break;
    }
  }

  // Extra settling time for dynamic data
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: outputPath, fullPage: true });
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
(async () => {
  console.log("=".repeat(70));
  console.log("SCREENSHOT USER GUIDE — Sistem SPPG");
  console.log("=".repeat(70));
  console.log(`Chrome path: ${CHROME_PATH}`);
  console.log(`FE base URL: ${BASE_FE}`);
  console.log(`Output root: ${SCREENSHOT_ROOT}`);
  console.log();

  // Check Chrome exists
  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`[FATAL] Chrome not found at: ${CHROME_PATH}`);
    console.error("Set PUPPETEER_EXECUTABLE_PATH in backend/.env to correct path.");
    process.exit(1);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1440,900",
      ],
    });
  } catch (e) {
    console.error(`[FATAL] puppeteer.launch failed: ${e.message}`);
    process.exit(1);
  }

  // Summary accumulators
  const summary = {}; // role -> { ok: [], fail: [] }
  const smallFiles = []; // files < 5KB

  try {
    for (const roleDef of ROLES) {
      const { role, username, password, menus } = roleDef;
      console.log("\n" + "─".repeat(60));
      console.log(`ROLE: ${role}  (user: ${username})`);
      console.log("─".repeat(60));

      summary[role] = { ok: [], fail: [] };

      const roleDir = path.join(SCREENSHOT_ROOT, role);
      mkdirp(roleDir);

      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);

      // Increased timeout
      page.setDefaultNavigationTimeout(NAV_TIMEOUT);
      page.setDefaultTimeout(NAV_TIMEOUT);

      // --- Logout / clear session before login ---
      try {
        await clearSession(page);
      } catch (e) {
        console.error(`  [WARN] clearSession error: ${e.message}`);
      }

      // --- Login ---
      try {
        await loginRole(page, username, password);
      } catch (e) {
        console.error(`  [ERROR] Login gagal untuk role ${role}: ${e.message}`);
        // Screenshot all menus as failed
        for (const menu of menus) {
          summary[role].fail.push({ name: menu.name, path: menu.path, reason: `Login gagal: ${e.message}` });
        }
        await page.close();
        continue;
      }

      // --- Screenshot each menu ---
      for (const menu of menus) {
        const filename = slugToFilename(menu.name);
        const outputPath = path.join(roleDir, filename);
        process.stdout.write(`  [${role}] ${menu.path.padEnd(40)} → ${filename} ... `);

        try {
          await screenshotMenu(page, menu.path, outputPath);

          // Check file size
          const stat = fs.statSync(outputPath);
          const kb = (stat.size / 1024).toFixed(1);
          console.log(`OK (${kb} KB)`);
          summary[role].ok.push({ name: menu.name, file: outputPath, sizeKB: parseFloat(kb) });

          if (stat.size < 5 * 1024) {
            smallFiles.push({ role, name: menu.name, file: outputPath, sizeKB: parseFloat(kb) });
          }
        } catch (e) {
          console.log(`FAIL`);
          console.error(`    [ERROR] ${e.message}`);
          summary[role].fail.push({ name: menu.name, path: menu.path, reason: e.message });
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  // ---------------------------------------------------------------------------
  // REPORT
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("LAPORAN HASIL SCREENSHOT");
  console.log("=".repeat(70));

  let grandTotal = 0;
  let grandOk = 0;
  let grandFail = 0;

  for (const [role, data] of Object.entries(summary)) {
    const total = data.ok.length + data.fail.length;
    grandTotal += total;
    grandOk += data.ok.length;
    grandFail += data.fail.length;
    console.log(`\n${role}: ${data.ok.length}/${total} OK`);
    if (data.fail.length > 0) {
      for (const f of data.fail) {
        console.log(`  ✗ GAGAL  ${f.path}  →  ${f.reason}`);
      }
    }
  }

  console.log(`\nTOTAL: ${grandOk}/${grandTotal} OK  |  GAGAL: ${grandFail}`);

  if (smallFiles.length > 0) {
    console.log("\nFILE < 5KB (kemungkinan blank/error page):");
    for (const f of smallFiles) {
      console.log(`  [${f.role}] ${f.name}  ${f.sizeKB} KB  →  ${f.file}`);
    }
  } else {
    console.log("\nTidak ada file < 5KB. Semua screenshot terlihat valid.");
  }

  console.log("\nSelesai.");
  process.exitCode = grandFail > 0 ? 1 : 0;
})();
