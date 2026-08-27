'use server';

import { db } from '@/db';
import { iotReadings } from '@/db/schema';
import { desc, eq, and, gte } from 'drizzle-orm';

export async function recordIoTReading(data: {
  sensorId: string;
  sensorType: string;
  zone: string;
  value: number;
  unit: string;
  isAlarm?: boolean;
}) {
  await db.insert(iotReadings).values({
    sensorId: data.sensorId,
    sensorType: data.sensorType,
    zone: data.zone,
    value: data.value,
    unit: data.unit,
    isAlarm: data.isAlarm ?? false,
  });

  return { success: true };
}

export async function getIoTHistory(sensorType: string, hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  return await db
    .select()
    .from(iotReadings)
    .where(
      and(
        eq(iotReadings.sensorType, sensorType),
        gte(iotReadings.recordedAt, since)
      )
    )
    .orderBy(desc(iotReadings.recordedAt))
    .limit(500);
}

export async function getLatestReadings() {
  return await db
    .select()
    .from(iotReadings)
    .orderBy(desc(iotReadings.recordedAt))
    .limit(50);
}
