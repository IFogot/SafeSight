import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
} from 'drizzle-orm/pg-core';

// ─── Safety Alerts (AI detection events) ────────────────────────────────────
export const safetyAlerts = pgTable('safety_alerts', {
  id: serial('id').primaryKey(),
  alertId: varchar('alert_id', { length: 64 }).notNull().unique(),
  title: text('title').notNull(),
  zone: varchar('zone', { length: 128 }).notNull(),
  location: varchar('location', { length: 256 }),
  riskLevel: varchar('risk_level', { length: 32 }).notNull(), // low | medium | high | critical
  type: varchar('type', { length: 64 }).notNull(), // ppe_violation | fall_detected | zone_breach | environmental
  details: jsonb('details'), // { th, en, my, km, lo }
  audioText: jsonb('audio_text'), // { th, en, my, km, lo }
  acknowledged: boolean('acknowledged').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Hazard Reports (near-miss tickets with multilingual translations) ──────
export const hazardReports = pgTable('hazard_reports', {
  id: serial('id').primaryKey(),
  reportId: varchar('report_id', { length: 64 }).notNull().unique(),
  reporterName: varchar('reporter_name', { length: 128 }).notNull(),
  reporterNationality: varchar('reporter_nationality', { length: 64 }),
  language: varchar('language', { length: 5 }).notNull(), // th | en | my | km | lo
  zone: varchar('zone', { length: 128 }).notNull(),
  location: varchar('location', { length: 256 }),
  category: varchar('category', { length: 64 }).notNull(),
  title: text('title').notNull(),
  descriptionOriginal: text('description_original'),
  descriptionTranslated: text('description_translated'),
  severity: varchar('severity', { length: 32 }).notNull(), // low | medium | high | critical
  status: varchar('status', { length: 32 }).default('pending'), // pending | investigating | resolved
  upvotes: integer('upvotes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Workers (profiles with XP, role, language preference) ──────────────────
export const workers = pgTable('workers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  role: varchar('role', { length: 64 }).notNull(), // safety_officer | worker | eec_admin
  nationality: varchar('nationality', { length: 64 }),
  preferredLanguage: varchar('preferred_language', { length: 5 }).default('th'),
  xpPoints: integer('xp_points').default(0),
  safetyScore: real('safety_score').default(100),
  badgesEarned: jsonb('badges_earned').default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Audit Log (immutable compliance event log) ─────────────────────────────
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 64 }).notNull().unique(),
  timestamp: timestamp('timestamp').defaultNow(),
  actor: varchar('actor', { length: 128 }).notNull(),
  action: varchar('action', { length: 256 }).notNull(),
  module: varchar('module', { length: 64 }).notNull(),
  zone: varchar('zone', { length: 128 }),
  severity: varchar('severity', { length: 32 }),
  details: text('details'),
  isoReference: varchar('iso_reference', { length: 64 }),
});

// ─── IoT Readings (time-series sensor telemetry) ────────────────────────────
export const iotReadings = pgTable('iot_readings', {
  id: serial('id').primaryKey(),
  sensorId: varchar('sensor_id', { length: 64 }).notNull(),
  sensorType: varchar('sensor_type', { length: 64 }).notNull(), // h2s | co | temp | noise | vibration | power
  zone: varchar('zone', { length: 128 }).notNull(),
  value: real('value').notNull(),
  unit: varchar('unit', { length: 32 }).notNull(),
  isAlarm: boolean('is_alarm').default(false),
  recordedAt: timestamp('recorded_at').defaultNow(),
});

// ─── Course Progress (academy completion & quiz scores) ─────────────────────
export const courseProgress = pgTable('course_progress', {
  id: serial('id').primaryKey(),
  workerId: integer('worker_id'),
  courseId: varchar('course_id', { length: 64 }).notNull(),
  courseTitle: text('course_title').notNull(),
  status: varchar('status', { length: 32 }).default('not_started'), // not_started | in_progress | completed
  quizScore: integer('quiz_score'),
  completedAt: timestamp('completed_at'),
  xpEarned: integer('xp_earned').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Type exports for use in Server Actions ─────────────────────────────────
export type SafetyAlert = typeof safetyAlerts.$inferSelect;
export type NewSafetyAlert = typeof safetyAlerts.$inferInsert;
export type HazardReport = typeof hazardReports.$inferSelect;
export type NewHazardReport = typeof hazardReports.$inferInsert;
export type Worker = typeof workers.$inferSelect;
export type NewWorker = typeof workers.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type IoTReading = typeof iotReadings.$inferSelect;
export type NewIoTReading = typeof iotReadings.$inferInsert;
export type CourseProgressEntry = typeof courseProgress.$inferSelect;
export type NewCourseProgressEntry = typeof courseProgress.$inferInsert;
