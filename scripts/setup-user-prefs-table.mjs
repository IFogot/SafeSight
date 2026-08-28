import { neon } from '@neondatabase/serverless';

const dbUrl = 'postgresql://neondb_owner:npg_wDYzQ3ImoiX1@ep-lingering-bonus-azto8k3e-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(dbUrl);

async function setup() {
  await sql`
    CREATE TABLE IF NOT EXISTS safesight_user_preferences (
      line_user_id VARCHAR(128) PRIMARY KEY,
      language VARCHAR(10) NOT NULL DEFAULT 'th',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  console.log('✅ Table safesight_user_preferences is ready in Neon PostgreSQL!');
}

setup().catch(console.error);
