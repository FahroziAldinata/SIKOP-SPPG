const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
const fs = require('fs');

async function launchPuppeteer() {
  let executablePath;
  let launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  } else if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    executablePath = candidates.find((p) => p && fs.existsSync(p)) || candidates[0];
  } else if (process.platform === 'darwin') {
    executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (process.env.NODE_ENV === 'production') {
    try {
      launchArgs = [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ];
      const execPath = await chromium.executablePath();
      if (execPath && fs.existsSync(execPath)) {
        executablePath = execPath;
      }
    } catch (err) {
      console.warn('[launchPuppeteer] chromium.executablePath() error:', err.message);
    }
  }

  if (!executablePath) {
    executablePath = '/usr/bin/google-chrome';
  }

  return puppeteer.launch({
    executablePath,
    args: launchArgs,
    headless: 'new',
  });
}

module.exports = { launchPuppeteer };

