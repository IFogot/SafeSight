import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { INITIAL_SAFETY_ALERTS, INITIAL_HAZARD_REPORTS, INITIAL_IOT_TELEMETRY } from '../core/mockData';

try {
  process.loadEnvFile?.('.env.local');
} catch {}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export async function seedDatabase() {
  console.log('🌱 Checking and seeding NeonDB database...');

  try {
    // 1. Seed Safety Alerts
    const existingAlerts = await db.select().from(schema.safetyAlerts).limit(1);
    if (existingAlerts.length === 0) {
      console.log('Inserting initial safety alerts...');
      for (const alert of INITIAL_SAFETY_ALERTS) {
        await db.insert(schema.safetyAlerts).values({
          alertId: alert.id,
          title: alert.title,
          zone: alert.zone,
          location: alert.location,
          riskLevel: alert.riskLevel,
          type: alert.type,
          details: alert.details,
          audioText: alert.audioText,
          acknowledged: alert.acknowledged,
        });
      }
      console.log(`✓ Inserted ${INITIAL_SAFETY_ALERTS.length} safety alerts.`);
    } else {
      console.log('✓ Safety alerts table already has data.');
    }

    // 2. Seed Hazard Reports
    const existingHazards = await db.select().from(schema.hazardReports).limit(1);
    if (existingHazards.length === 0) {
      console.log('Inserting initial hazard reports...');
      for (const report of INITIAL_HAZARD_REPORTS) {
        await db.insert(schema.hazardReports).values({
          reportId: report.id,
          reporterName: report.reporterName,
          reporterNationality: report.reporterNationality,
          language: report.language,
          zone: report.zone,
          location: report.location,
          category: report.category,
          title: report.title,
          descriptionOriginal: report.descriptionOriginal,
          descriptionTranslated: report.descriptionTranslated,
          severity: report.severity,
          status: report.status,
          upvotes: report.upvotes,
        });
      }
      console.log(`✓ Inserted ${INITIAL_HAZARD_REPORTS.length} hazard reports.`);
    } else {
      console.log('✓ Hazard reports table already has data.');
    }

    // 3. Seed Workers
    const existingWorkers = await db.select().from(schema.workers).limit(1);
    if (existingWorkers.length === 0) {
      console.log('Inserting initial workers...');
      const initialWorkers = [
        { name: 'Somchai Prasert (สมชาย)', role: 'safety_officer', nationality: 'Thailand', preferredLanguage: 'th', xpPoints: 940, safetyScore: 98.5, badgesEarned: ['PPE Champion', 'First Responder'] },
        { name: 'Aung Min (အောင်မင်း)', role: 'worker', nationality: 'Myanmar', preferredLanguage: 'my', xpPoints: 820, safetyScore: 96.0, badgesEarned: ['Hazard Hunter', 'GHS Certified'] },
        { name: 'Sok Dara (សុខ ដារ៉ា)', role: 'worker', nationality: 'Cambodia', preferredLanguage: 'km', xpPoints: 750, safetyScore: 94.2, badgesEarned: ['Safety Star'] },
        { name: 'Khamphanh (ຄຳພັນ)', role: 'worker', nationality: 'Laos', preferredLanguage: 'lo', xpPoints: 680, safetyScore: 92.5, badgesEarned: ['Fire Warden'] },
        { name: 'Eng. Kridawat T.', role: 'eec_admin', nationality: 'Thailand', preferredLanguage: 'th', xpPoints: 1200, safetyScore: 99.8, badgesEarned: ['EEC Safety Auditor', 'ISO 45001 Expert'] },
      ];
      for (const worker of initialWorkers) {
        await db.insert(schema.workers).values(worker);
      }
      console.log(`✓ Inserted ${initialWorkers.length} workers.`);
    } else {
      console.log('✓ Workers table already has data.');
    }

    // 4. Seed Audit Log
    const existingAudit = await db.select().from(schema.auditLog).limit(1);
    if (existingAudit.length === 0) {
      console.log('Inserting initial audit log entries...');
      const initialLogs = [
        {
          eventId: 'AUD-2026-001',
          actor: 'AI Vision Engine (YOLOv8-PPE)',
          action: 'Detected Missing Hard Hat in Stamping Cell #4',
          module: 'Live Vision Monitor',
          zone: 'Zone B',
          severity: 'high',
          details: 'Worker #412 detected without Type-1 industrial safety helmet. Audio warning broadcast in Thai & Burmese.',
          isoReference: 'ISO 45001:2018 §8.1.2',
        },
        {
          eventId: 'AUD-2026-002',
          actor: 'IoT Telemetry Sentinel',
          action: 'H2S Threshold Warning Triggered (18.4 ppm)',
          module: 'IoT Sentinel',
          zone: 'Zone A',
          severity: 'critical',
          details: 'Catalytic column sensor reading exceeded 15.0 ppm limit. Auto-ventilation stage 2 initiated.',
          isoReference: 'ISO 45001:2018 §8.2',
        },
        {
          eventId: 'AUD-2026-003',
          actor: 'Safety Officer Somchai P.',
          action: 'Acknowledged Forklift Proximity Alert #alt-102',
          module: 'Emergency Hub',
          zone: 'Zone D',
          severity: 'medium',
          details: 'Loading bay pedestrian barrier activated. Clearance verified via CCTV-04.',
          isoReference: 'Thai OSH Act B.E. 2554',
        },
      ];

      for (const log of initialLogs) {
        await db.insert(schema.auditLog).values(log);
      }
      console.log(`✓ Inserted ${initialLogs.length} audit entries.`);
    } else {
      console.log('✓ Audit log table already has data.');
    }

    // 5. Seed IoT Readings
    const existingIoT = await db.select().from(schema.iotReadings).limit(1);
    if (existingIoT.length === 0) {
      console.log('Inserting initial IoT readings...');
      for (const pt of INITIAL_IOT_TELEMETRY) {
        await db.insert(schema.iotReadings).values({
          sensorId: `SENS-${pt.zone.replace(/\s+/g, '-').toUpperCase()}-GAS`,
          sensorType: 'h2s',
          zone: pt.zone,
          value: pt.toxicGasH2S,
          unit: 'ppm',
          isAlarm: pt.status === 'danger' || pt.toxicGasH2S > 10,
        });
        await db.insert(schema.iotReadings).values({
          sensorId: `SENS-${pt.zone.replace(/\s+/g, '-').toUpperCase()}-TEMP`,
          sensorType: 'temp',
          zone: pt.zone,
          value: pt.temperature,
          unit: '°C',
          isAlarm: pt.temperature > 38,
        });
      }
      console.log('✓ Inserted initial IoT readings.');
    } else {
      console.log('✓ IoT readings table already has data.');
    }

    console.log('✨ NeonDB seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
  }
}

seedDatabase().catch(console.error);
