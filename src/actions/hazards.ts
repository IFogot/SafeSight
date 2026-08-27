'use server';

import { db } from '@/db';
import { hazardReports } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createHazardReport(data: {
  reporterName: string;
  reporterNationality?: string;
  language: string;
  zone: string;
  location?: string;
  category: string;
  title: string;
  descriptionOriginal?: string;
  descriptionTranslated?: string;
  severity: string;
}) {
  const reportId = `HR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await db.insert(hazardReports).values({
    reportId,
    reporterName: data.reporterName,
    reporterNationality: data.reporterNationality,
    language: data.language,
    zone: data.zone,
    location: data.location,
    category: data.category,
    title: data.title,
    descriptionOriginal: data.descriptionOriginal,
    descriptionTranslated: data.descriptionTranslated,
    severity: data.severity,
    status: 'pending',
    upvotes: 0,
  });

  revalidatePath('/');
  return { success: true, reportId };
}

export async function getHazardReports(limit = 50) {
  const reports = await db
    .select()
    .from(hazardReports)
    .orderBy(desc(hazardReports.createdAt))
    .limit(limit);

  return reports;
}

export async function upvoteHazardReport(reportId: string) {
  await db
    .update(hazardReports)
    .set({ upvotes: sql`${hazardReports.upvotes} + 1` })
    .where(eq(hazardReports.reportId, reportId));

  revalidatePath('/');
  return { success: true };
}

export async function updateHazardStatus(
  reportId: string,
  status: 'pending' | 'investigating' | 'resolved'
) {
  await db
    .update(hazardReports)
    .set({ status })
    .where(eq(hazardReports.reportId, reportId));

  revalidatePath('/');
  return { success: true };
}
