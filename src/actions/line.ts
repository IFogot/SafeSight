'use server';

import { db, lineMessages } from '@/db';
import { desc } from 'drizzle-orm';

/**
 * Server action to push a safety alert message to LINE OA via Cloudflare Worker
 */
export async function pushAlertToLine(alert: {
  title: string;
  zone: string;
  severity: string;
  details?: string;
}) {
  const workerUrl = process.env.LINE_WEBHOOK_WORKER_URL;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!workerUrl && !token) {
    console.warn('LINE OA: Neither LINE_WEBHOOK_WORKER_URL nor LINE_CHANNEL_ACCESS_TOKEN configured');
    return { success: false, reason: 'unconfigured' };
  }

  const alertText = `🚨 [SafeSight EEC แจ้งเตือนความปลอดภัย]\n\nเหตุการณ์: ${alert.title}\nโซน: ${alert.zone}\nระดับความเสี่ยง: ${alert.severity.toUpperCase()}\nรายละเอียด: ${alert.details || 'กรุณาตรวจสอบหน้างานทันที'}\n\n🌐 ดูข้อมูลสด: https://safesight-arise.vercel.app`;

  try {
    if (workerUrl) {
      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: alertText }),
      });
      return { success: res.ok };
    } else if (token) {
      const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ type: 'text', text: alertText }],
        }),
      });
      return { success: res.ok };
    }
  } catch (err: any) {
    console.error('Error broadcasting alert to LINE:', err);
    return { success: false, error: err.message };
  }

  return { success: false };
}

/**
 * Fetch recent LINE messages from database
 */
export async function getLineMessages(limit = 30) {
  try {
    const msgs = await db
      .select()
      .from(lineMessages)
      .orderBy(desc(lineMessages.createdAt))
      .limit(limit);
    return msgs;
  } catch (err) {
    console.error('Error getting LINE messages:', err);
    return [];
  }
}
