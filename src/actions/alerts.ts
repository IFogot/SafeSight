'use server';

import { db } from '@/db';
import { safetyAlerts } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createAlert(data: {
  title: string;
  zone: string;
  location?: string;
  riskLevel: string;
  type: string;
  details?: Record<string, string>;
  audioText?: Record<string, string>;
}) {
  const alertId = `AL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await db.insert(safetyAlerts).values({
    alertId,
    title: data.title,
    zone: data.zone,
    location: data.location,
    riskLevel: data.riskLevel,
    type: data.type,
    details: data.details,
    audioText: data.audioText,
    acknowledged: false,
  });

  revalidatePath('/');
  return { success: true, alertId };
}

export async function getAlerts(limit = 100) {
  const alerts = await db
    .select()
    .from(safetyAlerts)
    .orderBy(desc(safetyAlerts.createdAt))
    .limit(limit);

  return alerts;
}

export async function acknowledgeAlert(alertId: string) {
  await db
    .update(safetyAlerts)
    .set({ acknowledged: true })
    .where(eq(safetyAlerts.alertId, alertId));

  revalidatePath('/');
  return { success: true };
}

export async function clearAllAlerts() {
  await db.delete(safetyAlerts);
  revalidatePath('/');
  return { success: true };
}
