const prisma = require('../prisma');
const { logger } = require('../logger');

/**
 * Menghapus ChatLog yang berusia lebih dari `hariRetensi` (default 30 hari).
 * @param {number} hariRetensi - Jumlah hari batas retensi (default: 30)
 * @returns {Promise<{ count: number }>}
 */
async function hapusChatLogKadaluarsa(hariRetensi = 30) {
  try {
    const batasTanggal = new Date(Date.now() - hariRetensi * 24 * 60 * 60 * 1000);
    const result = await prisma.chatLog.deleteMany({
      where: {
        createdAt: {
          lt: batasTanggal
        }
      }
    });
    logger.info({ count: result.count, batasTanggal }, 'Berhasil menghapus ChatLog kadaluarsa');
    return result;
  } catch (err) {
    logger.error(err, 'Gagal menghapus ChatLog kadaluarsa');
    throw err;
  }
}

let isRunning = false;
let scheduledTimeoutHandle = null;
let scheduledIntervalHandle = null;

function getMsUntilTargetHour(targetHour = 2) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

async function runCronJob() {
  if (isRunning) {
    logger.warn('Job retensi ChatLog sedang berjalan, lewati tick ini.');
    return;
  }
  isRunning = true;
  try {
    await hapusChatLogKadaluarsa(30);
  } catch (err) {
    logger.error(err, 'Error pada cron job retensi ChatLog');
  } finally {
    isRunning = false;
  }
}

function initRetensiChatLogCron(targetHour = 2) {
  if (scheduledTimeoutHandle || scheduledIntervalHandle) {
    return;
  }

  const delay = getMsUntilTargetHour(targetHour);
  scheduledTimeoutHandle = setTimeout(() => {
    runCronJob();
    scheduledIntervalHandle = setInterval(runCronJob, 24 * 60 * 60 * 1000);
    if (scheduledIntervalHandle.unref) {
      scheduledIntervalHandle.unref();
    }
  }, delay);

  if (scheduledTimeoutHandle.unref) {
    scheduledTimeoutHandle.unref();
  }

  logger.info({ targetHour, delayMs: delay }, 'Cron job retensi ChatLog berhasil didaftarkan');
}

function stopRetensiChatLogCron() {
  if (scheduledTimeoutHandle) {
    clearTimeout(scheduledTimeoutHandle);
    scheduledTimeoutHandle = null;
  }
  if (scheduledIntervalHandle) {
    clearInterval(scheduledIntervalHandle);
    scheduledIntervalHandle = null;
  }
}

module.exports = {
  hapusChatLogKadaluarsa,
  initRetensiChatLogCron,
  stopRetensiChatLogCron
};
