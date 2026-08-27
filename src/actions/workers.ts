'use server';

import { db } from '@/db';
import { workers, courseProgress } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getWorkerProfile(workerId: number) {
  const worker = await db
    .select()
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);

  return worker[0] ?? null;
}

export async function getAllWorkers() {
  return await db.select().from(workers).orderBy(desc(workers.xpPoints));
}

export async function addWorkerPoints(workerId: number, points: number) {
  await db
    .update(workers)
    .set({ xpPoints: sql`${workers.xpPoints} + ${points}` })
    .where(eq(workers.id, workerId));

  revalidatePath('/');
  return { success: true };
}

export async function updateCourseProgress(data: {
  workerId: number;
  courseId: string;
  courseTitle: string;
  status: string;
  quizScore?: number;
  xpEarned?: number;
}) {
  // Upsert: update if exists, insert if not
  const existing = await db
    .select()
    .from(courseProgress)
    .where(eq(courseProgress.courseId, data.courseId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(courseProgress)
      .set({
        status: data.status,
        quizScore: data.quizScore,
        xpEarned: data.xpEarned,
        completedAt: data.status === 'completed' ? new Date() : undefined,
      })
      .where(eq(courseProgress.courseId, data.courseId));
  } else {
    await db.insert(courseProgress).values({
      workerId: data.workerId,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      status: data.status,
      quizScore: data.quizScore,
      xpEarned: data.xpEarned,
      completedAt: data.status === 'completed' ? new Date() : undefined,
    });
  }

  revalidatePath('/');
  return { success: true };
}

export async function getCourseProgress(workerId: number) {
  return await db
    .select()
    .from(courseProgress)
    .where(eq(courseProgress.workerId, workerId))
    .orderBy(desc(courseProgress.createdAt));
}
