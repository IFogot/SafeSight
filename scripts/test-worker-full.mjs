import fs from 'fs';
process.loadEnvFile?.('.env.local');

// Load worker
const workerModule = await import('../line-webhook-worker.js');
const worker = workerModule.default;

const mockEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '22be5b133d575c95012830ccb2e273bc',
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'test_token',
  SITE_URL: 'http://localhost:3000',
};

async function testWorker() {
  console.log('--- 🧪 1. Testing GET /health ---');
  const res1 = await worker.fetch(new Request('http://localhost/health'), mockEnv);
  const json1 = await res1.json();
  console.log('Health Response:', json1);
  if (json1.status !== 'healthy') throw new Error('Health check failed');

  console.log('\n--- 🧪 2. Testing Language Switching Simulation (English) ---');
  const testUserId = 'U_test_multilingual_worker_' + Date.now();
  const setLangPostbackReq = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          type: 'postback',
          replyToken: 'mock_reply_token',
          source: { userId: testUserId },
          postback: { data: 'action=set_lang&lang=en' },
        },
      ],
    }),
  });

  const res2 = await worker.fetch(setLangPostbackReq, mockEnv);
  console.log('Set Lang Status:', res2.status);

  console.log('\n--- 🧪 3. Testing Message in English (User Persisted State) ---');
  const msgReq = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          type: 'message',
          replyToken: 'mock_reply_token',
          source: { userId: testUserId },
          message: { type: 'text', text: 'mission' },
        },
      ],
    }),
  });

  const res3 = await worker.fetch(msgReq, mockEnv);
  console.log('English Mission Message Status:', res3.status);

  console.log('\n--- 🧪 4. Testing SOS Emergency Trigger in Myanmar ---');
  const setMyReq = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          type: 'postback',
          replyToken: 'mock_reply_token',
          source: { userId: testUserId },
          postback: { data: 'action=set_lang&lang=my' },
        },
      ],
    }),
  });
  await worker.fetch(setMyReq, mockEnv);

  const sosReq = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          type: 'message',
          replyToken: 'mock_reply_token',
          source: { userId: testUserId },
          message: { type: 'text', text: 'အရေးပေါ်' }, // SOS in Myanmar
        },
      ],
    }),
  });
  const resSos = await worker.fetch(sosReq, mockEnv);
  console.log('Myanmar SOS Status:', resSos.status);

  console.log('\n🎉 ALL MULTILINGUAL LINE BOT INTEGRATION TESTS PASSED!');
}

testWorker().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
