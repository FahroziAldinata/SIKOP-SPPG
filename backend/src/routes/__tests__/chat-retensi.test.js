'use strict';

const { PrismaClient } = require('@prisma/client');
const { hapusChatLogKadaluarsa, initRetensiChatLogCron, stopRetensiChatLogCron } = require('../../lib/chat/retensiChatLog');

const prisma = new PrismaClient();

describe('ChatLog Retention Policy & Cron Job', () => {
  let testUser;
  const logIds = [];

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        username: `test-retensi-${Date.now()}`,
        passwordHash: 'dummyhash',
        nama: 'Retensi Test User',
        role: 'ADMIN'
      }
    });
  });

  afterEach(() => {
    stopRetensiChatLogCron();
  });

  afterAll(async () => {
    if (logIds.length > 0) {
      await prisma.chatLog.deleteMany({
        where: { id: { in: logIds } }
      });
    }
    if (testUser && testUser.id) {
      try {
        await prisma.user.delete({ where: { id: testUser.id } });
      } catch {
        // ignore
      }
    }
    await prisma.$disconnect();
  });

  test('hapusChatLogKadaluarsa hanya menghapus ChatLog yang > 30 hari', async () => {
    const now = Date.now();
    const date31DaysAgo = new Date(now - 31 * 24 * 60 * 60 * 1000);
    const date29DaysAgo = new Date(now - 29 * 24 * 60 * 60 * 1000);
    const dateToday = new Date();

    const log31 = await prisma.chatLog.create({
      data: {
        userId: testUser.id,
        pertanyaan: 'Tes 31 hari lalu',
        jawaban: 'Jawaban 31 hari lalu',
        roleSnapshot: testUser.role,
        provider: 'mock',
        model: 'mock-model',
        status: 'success',
        createdAt: date31DaysAgo
      }
    });

    const log29 = await prisma.chatLog.create({
      data: {
        userId: testUser.id,
        pertanyaan: 'Tes 29 hari lalu',
        jawaban: 'Jawaban 29 hari lalu',
        roleSnapshot: testUser.role,
        provider: 'mock',
        model: 'mock-model',
        status: 'success',
        createdAt: date29DaysAgo
      }
    });

    const log0 = await prisma.chatLog.create({
      data: {
        userId: testUser.id,
        pertanyaan: 'Tes hari ini',
        jawaban: 'Jawaban hari ini',
        roleSnapshot: testUser.role,
        provider: 'mock',
        model: 'mock-model',
        status: 'success',
        createdAt: dateToday
      }
    });

    logIds.push(log31.id, log29.id, log0.id);

    const res = await hapusChatLogKadaluarsa(30);

    expect(res.count).toBeGreaterThanOrEqual(1);

    const find31 = await prisma.chatLog.findUnique({ where: { id: log31.id } });
    expect(find31).toBeNull();

    const find29 = await prisma.chatLog.findUnique({ where: { id: log29.id } });
    expect(find29).not.toBeNull();

    const find0 = await prisma.chatLog.findUnique({ where: { id: log0.id } });
    expect(find0).not.toBeNull();
  });

  test('edge case: tidak ada data > 30 hari -> return count 0 tanpa error', async () => {
    const res = await hapusChatLogKadaluarsa(30);
    expect(res.count).toBe(0);
  });

  test('initRetensiChatLogCron dan stopRetensiChatLogCron dapat dipanggil tanpa error', () => {
    expect(() => {
      initRetensiChatLogCron(2);
      stopRetensiChatLogCron();
    }).not.toThrow();
  });
});
