'use server';

import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { desc, ilike, or } from 'drizzle-orm';

export async function createAuditEntry(data: {
  actor: string;
  action: string;
  module: string;
  zone?: string;
  severity?: string;
  details?: string;
  isoReference?: string;
}) {
  const eventId = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await db.insert(auditLog).values({
    eventId,
    actor: data.actor,
    action: data.action,
    module: data.module,
    zone: data.zone,
    severity: data.severity,
    details: data.details,
    isoReference: data.isoReference,
  });

  return { success: true, eventId };
}

export async function getAuditLog(options?: {
  search?: string;
  limit?: number;
}) {
  const limit = options?.limit ?? 200;

  if (options?.search) {
    const searchTerm = `%${options.search}%`;
    return await db
      .select()
      .from(auditLog)
      .where(
        or(
          ilike(auditLog.action, searchTerm),
          ilike(auditLog.actor, searchTerm),
          ilike(auditLog.module, searchTerm),
          ilike(auditLog.details, searchTerm)
        )
      )
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  return await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.timestamp))
    .limit(limit);
}

export async function exportAuditCSV() {
  const entries = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.timestamp));

  const headers = [
    'Event ID',
    'Timestamp',
    'Actor',
    'Action',
    'Module',
    'Zone',
    'Severity',
    'Details',
    'ISO Reference',
  ];

  const rows = entries.map((e) =>
    [
      e.eventId,
      e.timestamp?.toISOString() ?? '',
      e.actor,
      e.action,
      e.module,
      e.zone ?? '',
      e.severity ?? '',
      (e.details ?? '').replace(/,/g, ';'),
      e.isoReference ?? '',
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
