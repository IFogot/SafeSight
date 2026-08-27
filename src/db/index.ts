import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a Neon SQL function using the HTTP driver (serverless-compatible)
const sql = neon(process.env.DATABASE_URL!);

// Create the Drizzle ORM instance with schema
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from './schema';
