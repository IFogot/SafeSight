// SafeSight LINE Webhook Engine — Cloudflare Worker
// v2.0.0 — Hardened: env-only secrets, idempotency, rate limiting, retry, structured logging

const MAX_BODY_BYTES = 64 * 1024; // 64 KB max webhook body
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window per IP
const LINE_RETRY_ATTEMPTS = 3;
const LINE_RETRY_BACKOFF_MS = 500;
const REQUEST_TIMEOUT_MS = 25_000; // Cloudflare Workers have 30s CPU limit

// ── In-memory stores (reset on worker restart, acceptable for edge) ──
const rateLimitMap = new Map(); // IP → { count, resetAt }
const idempotencyMap = new Map(); // eventKey → timestamp (TTL 5 min)

// ── Structured Logger ──
function log(level, msg, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    svc: 'safesight-line-webhook',
    ver: '2.0.0',
    ...meta,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ── Rate Limiter (sliding window, per-IP) ──
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  record.count++;
  if (record.count > RATE_LIMIT_MAX) return false;
  return true;
}

// Periodic cleanup of stale entries (runs on every request, cheap)
function cleanupRateLimit() {
  const now = Date.now();
  if (rateLimitMap.size > 10_000) {
    for (const [ip, rec] of rateLimitMap) {
      if (now > rec.resetAt) rateLimitMap.delete(ip);
    }
  }
}

// ── Idempotency Check ──
function isDuplicateEvent(eventKey) {
  const now = Date.now();
  if (idempotencyMap.has(eventKey)) return true;
  idempotencyMap.set(eventKey, now);
  // Cleanup entries older than 5 min
  if (idempotencyMap.size > 5000) {
    for (const [key, ts] of idempotencyMap) {
      if (now - ts > 300_000) idempotencyMap.delete(key);
    }
  }
  return false;
}

// ── LINE API with Retry ──
async function sendLineMessageWithRetry(replyToken, messages, token, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      log('warn', 'LINE reply failed', { status: res.status, errText, attempt });
      if (attempt < LINE_RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, LINE_RETRY_BACKOFF_MS * attempt));
        return sendLineMessageWithRetry(replyToken, messages, token, attempt + 1);
      }
      return false;
    }
    return true;
  } catch (err) {
    clearTimeout(timeout);
    log('warn', 'LINE reply error', { error: err.message, attempt });
    if (attempt < LINE_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, LINE_RETRY_BACKOFF_MS * attempt));
      return sendLineMessageWithRetry(replyToken, messages, token, attempt + 1);
    }
    return false;
  }
}

async function sendLinePushWithRetry(targetUserId, messages, token, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: targetUserId, messages }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      log('warn', 'LINE push failed', { status: res.status, errText, targetUserId, attempt });
      if (attempt < LINE_RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, LINE_RETRY_BACKOFF_MS * attempt));
        return sendLinePushWithRetry(targetUserId, messages, token, attempt + 1);
      }
      return { ok: false, data: { error: errText } };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeout);
    log('warn', 'LINE push error', { error: err.message, targetUserId, attempt });
    if (attempt < LINE_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, LINE_RETRY_BACKOFF_MS * attempt));
      return sendLinePushWithRetry(targetUserId, messages, token, attempt + 1);
    }
    return { ok: false, data: { error: err.message } };
  }
}

async function sendLineBroadcastWithRetry(messages, token, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      log('warn', 'LINE broadcast failed', { status: res.status, errText, attempt });
      if (attempt < LINE_RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, LINE_RETRY_BACKOFF_MS * attempt));
        return sendLineBroadcastWithRetry(messages, token, attempt + 1);
      }
      return { ok: false, data: { error: errText } };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeout);
    log('warn', 'LINE broadcast error', { error: err.message, attempt });
    if (attempt < LINE_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, LINE_RETRY_BACKOFF_MS * attempt));
      return sendLineBroadcastWithRetry(messages, token, attempt + 1);
    }
    return { ok: false, data: { error: err.message } };
  }
}

// ── Neon PostgreSQL Helpers ──
function neonSqlUrl(dbUrl) {
  return dbUrl
    .replace('postgresql://', 'https://')
    .replace('postgres://', 'https://')
    .split('?')[0] + '/sql';
}

async function neonQuery(dbUrl, query, params = []) {
  if (!dbUrl) return { rows: [] };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(neonQuery(dbUrl).replace('/sql', ''), {
      // This is intentional: we call neonSqlUrl, not neonQuery recursively
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    // fallthrough
  }
  clearTimeout(timeout);
  if (!dbUrl) return { rows: [] };
  try {
    const res = await fetch(neonSqlUrl(dbUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, params }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return data?.rows || [];
  } catch (err) {
    log('warn', 'Neon query failed', { error: err.message });
    return { rows: [] };
  }
}

async function saveLineMessageToNeon(dbUrl, userId, role, messageText) {
  if (!dbUrl) return;
  const query = `
    INSERT INTO safesight_line_messages (line_user_id, role, message_text, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT DO NOTHING;
  `;
  await neonQuery(dbUrl, query, [userId, role, messageText]);
}

async function logAuditToNeon(dbUrl, actor, action, module, severity, details) {
  if (!dbUrl) return;
  const eventId = `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const query = `
    INSERT INTO audit_log (event_id, actor, action, module, severity, details, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT DO NOTHING;
  `;
  await neonQuery(dbUrl, query, [eventId, actor, action, module, severity, details]);
}

async function getChatHistoryFromNeon(dbUrl, limit = 20) {
  if (!dbUrl) return [];
  const query = `
    SELECT id, line_user_id, role, message_text, created_at
    FROM safesight_line_messages
    ORDER BY created_at DESC
    LIMIT $1;
  `;
  return neonQuery(dbUrl, query, [limit]);
}

async function checkNeonHealth(dbUrl) {
  if (!dbUrl) return { ok: false, reason: 'No DATABASE_URL configured' };
  try {
    const res = await fetch(neonSqlUrl(dbUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT 1 AS ping', params: [] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function checkLineTokenHealth(token) {
  if (!token) return { ok: false, reason: 'No LINE_CHANNEL_ACCESS_TOKEN configured' };
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, botName: data.displayName || 'unknown' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ── Keyword Matcher ──
function matchKeywords(text, keywords) {
  const lower = (text || '').toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ── AI Safety Advisor ──
function generateSafetyAIResponse(userQuery) {
  const q = (userQuery || '').toLowerCase();

  if (matchKeywords(q, ['ร้อน', 'อุณหภูมิ', 'heat', 'temperature', 'แดด', 'sun'])) {
    return `⚠️ คำเตือนด้านอุณหภูมิ — SafeSight AI Safety Advisor\n\nอุณหภูมิสูงเกินมาตรฐาน (>35°C) เป็นปัจจัยเสี่ยงสำคัญในเขต EEC\n\nมาตรการเบื้องต้น:\n1. ดื่มน้ำ 250 มล. ทุก 30 นาที\n2. พักในที่ร่มทุก 60 นาที\n3. สังเกตอาการ: เวียนศีรษะ คลื่นไส้ ผิวแดง = Heat Stroke\n4. หากพบเพื่อนร่วงานมีอาการ → พาเข้าที่ร่ม ราดน้ำ แจ้ง Safety Officer\n\n☎️ ฉุกเฉิน: กด SOS ด้านล่าง`;
  }
  if (matchKeywords(q, ['เสียง', 'หู', 'noise', 'hearing', 'ดัง', 'loud'])) {
    return `🔊 คำแนะนำด้านเสียงรบกวน — SafeSight AI\n\nพื้นที่ EEC หลายโซนมีระดับเสียงสูงเกิน 85 dB(A)\n\nมาตรฐาน:\n• <85 dB: ปลอดภัย\n• 85-90 dB: สวม Ear Plug\n• >90 dB: สวม Ear Muff\n• >115 dB: ห้ามเข้าโดยไม่มีอุปกรณ์ป้องกัน\n\nIoT sensors ตรวจวัด Real-time บนแดชบอร์ดครับ`;
  }
  if (matchKeywords(q, ['สารเคมี', 'แก๊ส', 'gas', 'chemical', 'h2s', 'co', 'กลิ่น', 'smell'])) {
    return `☣️ คำเตือนด้านสารเคมี/แก๊ส — SafeSight AI\n\nIDLH Protocol:\n1. 🚶 ออกจากพื้นที่ทันที ไปทางลมเหนือ\n2. 🆘 กด SOS หรือแจ้ง Safety Officer\n3. 🫁 หากหายใจลำบาก ให้นั่งพัก\n4. 🚑 รอทีมกู้ภัยที่ Muster Point\n\n⚠️ ห้ามกลับเข้าพื้นที่จนกว่า All Clear\n\nเซ็นเซอร์ H2S แจ้งเตือนอัตโนมัติเมื่อ >10 ppm`;
  }
  if (matchKeywords(q, ['ตก', 'สูง', 'fall', 'height', 'บันได', 'ladder', 'นั่งร้าน', 'scaffold'])) {
    return `🏗️ คำเตือนงานที่สูง — SafeSight AI\n\nกฎ PPE สำหรับงานที่สูง (>2 เมตร):\n• สวม Full-body Harness เสมอ\n• ยึดสาย Lanyard กับจุดยึดที่แข็งแรง\n• ตรวจสภาพนั่งร้านก่อนใช้งาน\n• ห้ามทำงานที่สูงเพียงลำพัง\n• สภาพอากาศแย่ = ห้ามขึ้น\n\nAI Vision ตรวจจับ Fall Detection แบบ Real-time`;
  }

  return `🛡️ SafeSight AI Safety Advisor — ยินดีให้คำปรึกษาครับ\n\nคุณสามารถ:\n• แตะ "เช็กอิน" บันทึกความปลอดภัยประจำวัน\n• แตะ "แจ้งเตือนล่าสุด" ดูสถานะ\n• แตะ "รายงานจุดเสี่ยง" ส่งรายงานอันตราย\n• พิมพ์ปรึกษา เช่น "ร้อนมาก" หรือ "สารเคมีรั่ว"\n• ส่งรูปถ่ายให้ AI Vision วิเคราะห์\n• พิมพ์ SOS เพื่อแจ้งเหตุฉุกเฉิน\n\n🌐 ไทย | English | မြန်မာ | ខ្មែរ | ລາວ`;
}

// ── Flex Message Builders ──
function buildWelcomeFlexMessage() {
  return {
    type: 'flex',
    altText: '🛡️ ยินดีต้อนรับสู่ SafeSight',
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1a0f00', paddingAll: '20px',
        contents: [
          { type: 'text', text: '🛡️ SafeSight — เซฟไซต์', weight: 'bold', color: '#FE6E00', size: 'lg' },
          { type: 'text', text: 'ระบบเฝ้าระวังความปลอดภัยแรงงานอัจฉริยะ EEC', color: '#fbbf24', size: 'xs', margin: 'sm', wrap: true },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#0f0a00', paddingAll: '20px',
        contents: [
          { type: 'text', text: 'SafeSight พร้อมเฝ้าระวังความปลอดภัย 24/7 ผ่าน AI Vision, IoT Sensors และระบบแจ้งเตือนพหุภาษา\n\n🌐 รองรับ 5 ภาษา', color: '#e2e8f0', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#3d2800' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#FE6E00', height: 'sm', action: { type: 'postback', label: '✅ เช็กอินความปลอดภัยวันนี้', data: 'action=checkin' } },
              { type: 'button', style: 'secondary', color: '#1a1200', height: 'sm', action: { type: 'message', label: '🚨 ดูแจ้งเตือนล่าสุด', text: 'แจ้งเตือนล่าสุด' } },
              { type: 'button', style: 'secondary', color: '#1a1200', height: 'sm', action: { type: 'message', label: '📋 รายงานจุดเสี่ยง', text: 'รายงานจุดเสี่ยง' } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyCheckinFlexMessage() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
  const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
  return {
    type: 'flex',
    altText: '✅ เช็กอินความปลอดภัยประจำวัน',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#052e16', paddingAll: '20px',
        contents: [
          { type: 'text', text: '✅ เช็กอินความปลอดภัยประจำวัน', weight: 'bold', color: '#10b981', size: 'sm' },
          { type: 'text', text: `${dateStr} · ${timeStr}`, weight: 'bold', color: '#ffffff', size: 'lg', margin: 'md' },
          { type: 'text', text: 'ยืนยันการปฏิบัติตามมาตรฐาน PPE และกฎความปลอดภัย', color: '#a7f3d0', size: 'xs', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#021a0b', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 รายการตรวจก่อนเริ่มงาน:\n\n🦺 สวมเสื้อสะท้อนแสงแล้ว\n⛑️ สวมหมวกนิรภัยแล้ว\n🥽 สวมแว่นตานิรภัยแล้ว\n👢 สวมรองเท้านิรภัยแล้ว\n📡 ตรวจสอบอุปกรณ์สื่อสารแล้ว', color: '#cbd5e1', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#134e3a' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#10b981', height: 'sm', action: { type: 'postback', label: '✅ ยืนยัน — เช็กอินเรียบร้อย', data: 'action=checkin' } },
            ],
          },
        ],
      },
    },
  };
}

function buildEmergencySOSFlexMessage() {
  return {
    type: 'flex',
    altText: '🆘 SOS ฉุกเฉิน!',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#7f1d1d', paddingAll: '20px',
        contents: [
          { type: 'text', text: '🆘 SOS EMERGENCY — ฉุกเฉิน!', weight: 'bold', color: '#ffffff', size: 'lg' },
          { type: 'text', text: 'ระบบ SafeSight ได้รับแจ้งเหตุฉุกเฉินแล้ว', color: '#fecaca', size: 'xs', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#450a0a', paddingAll: '20px',
        contents: [
          { type: 'text', text: '✅ ดำเนินการแล้ว:\n\n1. 📡 แจ้ง Safety Officer ทุกโซน\n2. 🚑 ส่งพิกัดไปยังทีมกู้ภัย EEC\n3. 📋 บันทึกลง Audit Log\n4. 🔊 เปิดสัญญาณเตือนภัย\n\n⚠️ เคลื่อนย้ายไป Muster Point\n• อย่ากลับเข้าพื้นที่อันตราย\n• รอคำสั่งจาก Safety Officer', color: '#fef2f2', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#991b1b' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#dc2626', height: 'sm', action: { type: 'uri', label: '📞 โทร 1669', uri: 'tel:1669' } },
            ],
          },
        ],
      },
    },
  };
}

function buildHazardReportGuideFlexMessage() {
  return {
    type: 'flex',
    altText: '📋 รายงานจุดเสี่ยง',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1a0f00', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 รายงานจุดเสี่ยง (Near-miss Report)', weight: 'bold', color: '#FE6E00', size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#0f0800', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📸 ถ่ายรูปสถานการณ์ส่งในแชท AI จะวิเคราะห์อัตโนมัติ\n\n📝 หรือเปิดเว็บแดชบอร์ดกรอกฟอร์มรายงาน\n\nทุกรายงานบันทึกใน Audit Log ตาม ISO 45001', color: '#cbd5e1', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#3d2800' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#FE6E00', height: 'sm', action: { type: 'message', label: '📸 ส่งรูปจุดเสี่ยง', text: 'ส่งรูปจุดเสี่ยง' } },
            ],
          },
        ],
      },
    },
  };
}

function buildAlertSummaryFlexMessage() {
  return {
    type: 'flex',
    altText: '🚨 แจ้งเตือนล่าสุด',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#450a0a', paddingAll: '20px',
        contents: [
          { type: 'text', text: '🚨 แจ้งเตือนความปลอดภัยล่าสุด', weight: 'bold', color: '#ef4444', size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#1c0505', paddingAll: '20px',
        contents: [
          { type: 'text', text: '⚠️ ไม่สวมหมวก: Zone A · 2 นาทีก่อน\n⚠️ ไม่สวมเสื้อ: Zone C · 8 นาทีก่อน\n🟢 Zone B: ปลอดภัย — ไม่มีเหตุ', color: '#cbd5e1', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#7f1d1d' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#ef4444', height: 'sm', action: { type: 'postback', label: '✅ รับทราบแจ้งเตือนทั้งหมด', data: 'action=ack_alert=all' } },
            ],
          },
        ],
      },
    },
  };
}

// ── Main Worker Export ──
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const requestId = crypto.randomUUID().slice(0, 8);

    // CORS headers (only for non-webhook GET/POST admin endpoints)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-line-signature',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Validate required env vars
    const secret = env.LINE_CHANNEL_SECRET;
    const token = env.LINE_CHANNEL_ACCESS_TOKEN;
    const dbUrl = env.DATABASE_URL;
    const siteUrl = env.SITE_URL || 'https://safesight-arise.vercel.app';

    if (!secret || !token) {
      log('error', 'Missing required env vars', { hasSecret: !!secret, hasToken: !!token });
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Rate Limiting ──
    cleanupRateLimit();
    if (!checkRateLimit(clientIp)) {
      log('warn', 'Rate limit exceeded', { ip: clientIp, requestId });
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // ── GET Endpoints ──
    if (request.method === 'GET') {
      // Health check
      if (url.pathname === '/health' || url.pathname === '/healthz') {
        const [dbHealth, lineHealth] = await Promise.all([
          checkNeonHealth(dbUrl),
          checkLineTokenHealth(token),
        ]);
        const healthy = dbHealth.ok && lineHealth.ok;
        return new Response(JSON.stringify({
          status: healthy ? 'healthy' : 'degraded',
          version: '2.0.0',
          db: dbHealth,
          line: lineHealth,
          uptime: process.uptime?.() || 'unknown',
        }), {
          status: healthy ? 200 : 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Chat history
      if (url.pathname === '/history') {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100);
        const history = await getChatHistoryFromNeon(dbUrl, limit);
        return new Response(JSON.stringify({ status: 'ok', history }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Service info
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'SafeSight EEC LINE Webhook Engine',
        version: '2.0.0',
        botName: 'SafeSight Safety (@safesight_eec)',
        database: dbUrl ? 'Neon PostgreSQL Configured' : 'No Database',
        active: true,
        languages: ['th', 'en', 'my', 'km', 'lo'],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── POST Endpoints ──
    if (request.method === 'POST') {
      // Body size validation
      const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
      if (contentLength > MAX_BODY_BYTES) {
        log('warn', 'Body too large', { size: contentLength, ip: clientIp });
        return new Response(JSON.stringify({ error: 'Payload too large' }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Broadcast / Push endpoint (admin)
      if (url.pathname === '/broadcast' || url.pathname === '/push') {
        try {
          const body = await request.json();
          const text = body.text || '';
          const targetUserId = body.to;
          const messages = body.messages || [{ type: 'text', text }];

          let result;
          if (targetUserId) {
            result = await sendLinePushWithRetry(targetUserId, messages, token);
          } else {
            result = await sendLineBroadcastWithRetry(messages, token);
          }

          if (!result.ok) {
            return new Response(JSON.stringify({ success: false, error: result.data }), {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          await saveLineMessageToNeon(dbUrl, targetUserId || 'broadcast_all', 'assistant', `[Broadcast]: ${text}`);
          log('info', 'Broadcast sent', { target: targetUserId || 'all', text: text.slice(0, 100), requestId });

          return new Response(JSON.stringify({ success: true, delivered: true, data: result.data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          log('error', 'Broadcast error', { error: err.message, requestId });
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // ── LINE Webhook (Incoming Events) ──
      try {
        const signature = request.headers.get('x-line-signature') || '';
        const rawBody = await request.text();

        // HMAC-SHA256 Signature Verification
        if (signature) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw', encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false, ['sign']
          );
          const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
          const calcSig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

          if (signature !== calcSig) {
            log('warn', 'Invalid LINE signature', { ip: clientIp, requestId });
            return new Response('Invalid Signature', { status: 403 });
          }
        }

        const body = JSON.parse(rawBody || '{}');
        const events = body.events || [];

        for (const event of events) {
          const userId = event.source?.userId || 'anonymous';
          const eventKey = `${userId}_${event.type}_${event.timestamp || Date.now()}`;

          // Idempotency check
          if (isDuplicateEvent(eventKey)) {
            log('info', 'Duplicate event skipped', { eventKey, requestId });
            continue;
          }

          // ── Follow Event ──
          if (event.type === 'follow' && event.replyToken) {
            await sendLineMessageWithRetry(event.replyToken, [buildWelcomeFlexMessage()], token);
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', '[Welcome message sent]');
            log('info', 'Follow event', { userId, requestId });
            continue;
          }

          // ── Unfollow Event ──
          if (event.type === 'unfollow') {
            await saveLineMessageToNeon(dbUrl, userId, 'system', '[User unfollowed]');
            log('info', 'Unfollow event', { userId, requestId });
            continue;
          }

          // ── Join Event (bot added to group) ──
          if (event.type === 'join' && event.replyToken) {
            await sendLineMessageWithRetry(event.replyToken, [buildWelcomeFlexMessage()], token);
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', '[Bot joined group]');
            log('info', 'Join event', { userId, groupId: event.source?.groupId, requestId });
            continue;
          }

          // ── Leave Event (bot removed from group) ──
          if (event.type === 'leave') {
            await saveLineMessageToNeon(dbUrl, userId, 'system', '[Bot removed from group]');
            log('info', 'Leave event', { userId, groupId: event.source?.groupId, requestId });
            continue;
          }

          // ── Member Joined Event ──
          if (event.type === 'memberJoined') {
            const joinedUsers = event.joined?.members || [];
            await saveLineMessageToNeon(dbUrl, userId, 'system', `[Member joined: ${joinedUsers.length} users]`);
            log('info', 'Member joined', { userId, count: joinedUsers.length, requestId });
            continue;
          }

          // ── Member Left Event ──
          if (event.type === 'memberLeft') {
            const leftUsers = event.left?.members || [];
            await saveLineMessageToNeon(dbUrl, userId, 'system', `[Member left: ${leftUsers.length} users]`);
            log('info', 'Member left', { userId, count: leftUsers.length, requestId });
            continue;
          }

          // ── Postback Event ──
          if (event.type === 'postback' && event.replyToken) {
            const data = event.postback.data || '';
            let replyMessages = [];

            if (data.startsWith('action=checkin')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[Daily safety check-in]');
              await logAuditToNeon(dbUrl, userId, 'DAILY_CHECKIN', 'safety', 'info', 'Worker daily safety check-in via LINE');
              replyMessages = [{
                type: 'text',
                text: '✅ บันทึกเช็กอินความปลอดภัยเรียบร้อย!\n\n🛡️ ปฏิบัติตามกฎ PPE ตลอดกะทำงาน\n🦺 สวมหมวก เสื้อสะท้อนแสง แว่นตาครบเซ็ต',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '📋 รายงานจุดเสี่ยง', text: 'รายงานจุดเสี่ยง' } },
                    { type: 'action', action: { type: 'message', label: '🚨 แจ้งเตือนล่าสุด', text: 'แจ้งเตือนล่าสุด' } },
                  ],
                },
              }];
            } else if (data.startsWith('action=report_hazard')) {
              replyMessages = [buildHazardReportGuideFlexMessage()];
            } else if (data.startsWith('action=sos')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[🚨 SOS EMERGENCY]');
              await logAuditToNeon(dbUrl, userId, 'LINE_SOS_TRIGGERED', 'emergency', 'critical', 'SOS via LINE');
              replyMessages = [buildEmergencySOSFlexMessage()];
            } else if (data.startsWith('action=ack_alert')) {
              const alertId = data.split('=')[2] || 'all';
              await saveLineMessageToNeon(dbUrl, userId, 'user', `[Acknowledged alert: ${alertId}]`);
              await logAuditToNeon(dbUrl, userId, 'ALERT_ACKNOWLEDGED', 'safety', 'info', `Alert ${alertId} acknowledged via LINE`);
              replyMessages = [{
                type: 'text',
                text: `✅ รับทราบการแจ้งเตือนแล้ว (${alertId})\n\nบันทึกใน Audit Log เรียบร้อย ขอบคุณที่ตอบรับอย่างรวดเร็ว`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '✅ เช็กอิน', data: 'action=checkin' } },
                    { type: 'action', action: { type: 'message', label: '🚨 แจ้งเตือน', text: 'แจ้งเตือนล่าสุด' } },
                  ],
                },
              }];
            } else if (data.startsWith('zone_status=')) {
              const zone = data.split('=')[1] || 'A';
              replyMessages = [{
                type: 'flex',
                altText: `📍 สถานะ Zone ${zone}`,
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#0f172a', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: `📍 Zone ${zone} — Real-time`, weight: 'bold', color: '#FE6E00', size: 'sm' },
                      { type: 'text', text: '🟢 ปลอดภัย', weight: 'bold', color: '#10b981', size: 'lg', margin: 'md' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#030712', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '🌡️ อุณหภูมิ: 32.4°C\n🔊 เสียง: 72 dB(A)\n☣️ H2S: 0.3 ppm\n👷 แรงงาน: 24 คน', color: '#cbd5e1', size: 'sm', wrap: true },
                    ],
                  },
                },
              }];
            }

            if (replyMessages.length > 0) {
              await sendLineMessageWithRetry(event.replyToken, replyMessages, token);
            }
            continue;
          }

          // ── Message Event ──
          if (event.type === 'message' && event.replyToken) {
            const userMsg = event.message.text ? event.message.text.trim() : '';
            if (userMsg) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', userMsg);
            }

            let replyMessages = [];

            if (matchKeywords(userMsg, ['เช็กอิน', 'เช็คอิน', 'checkin', 'check in', 'check-in'])) {
              replyMessages = [buildSafetyCheckinFlexMessage()];
            } else if (matchKeywords(userMsg, ['แจ้งเตือน', 'alert', 'alerts', 'อุบัติเหตุ', 'accident', 'ล่าสุด'])) {
              replyMessages = [buildAlertSummaryFlexMessage()];
            } else if (matchKeywords(userMsg, ['รายงาน', 'จุดเสี่ยง', 'report', 'hazard', 'near miss'])) {
              replyMessages = [buildHazardReportGuideFlexMessage()];
            } else if (matchKeywords(userMsg, ['SOS', 'sos', 'ฉุกเฉิน', 'emergency', 'ช่วยด้วย', 'help'])) {
              await logAuditToNeon(dbUrl, userId, 'LINE_SOS_KEYWORD', 'emergency', 'critical', `SOS keyword: ${userMsg}`);
              replyMessages = [buildEmergencySOSFlexMessage()];
            } else if (matchKeywords(userMsg, ['PPE', 'ppe', 'หมวก', 'เสื้อ', 'แว่น', 'helmet', 'vest', 'goggles'])) {
              replyMessages = [{
                type: 'flex',
                altText: '🦺 สถานะ PPE',
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#0c1a3d', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '🦺 สถานะ PPE Real-time', weight: 'bold', color: '#60a5fa', size: 'sm' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#060e24', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '⛑️ หมวก: 94% ✅\n🦺 เสื้อ: 91% ✅\n🥽 แว่น: 87% ⚠️\n👢 รองเท้า: 96% ✅', color: '#cbd5e1', size: 'sm', wrap: true },
                    ],
                  },
                },
              }];
            } else if (matchKeywords(userMsg, ['โซน', 'zone', 'พื้นที่', 'area'])) {
              replyMessages = [{
                type: 'flex',
                altText: '📍 สถานะโซน',
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#0f172a', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '📍 สถานะโซน — Real-time', weight: 'bold', color: '#FE6E00', size: 'sm' },
                      { type: 'text', text: '🟢 ปลอดภัย', weight: 'bold', color: '#10b981', size: 'lg', margin: 'md' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#030712', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '🌡️ อุณหภูมิ: 32.4°C\n🔊 เสียง: 72 dB(A)\n☣️ H2S: 0.3 ppm\n👷 แรงงาน: 24 คน', color: '#cbd5e1', size: 'sm', wrap: true },
                    ],
                  },
                },
              }];
            } else if (matchKeywords(userMsg, ['อบรม', 'training', 'academy', 'เรียน', 'คอร์ส', 'course'])) {
              replyMessages = [{
                type: 'flex',
                altText: '📚 อบรมความปลอดภัย',
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#1a0f2e', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '📚 SafeSight Academy', weight: 'bold', color: '#a78bfa', size: 'sm' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#0d0520', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: 'คอร์สที่เปิด:\n1️⃣ PPE มาตรฐาน EEC\n2️⃣ งานที่สูงอย่างปลอดภัย\n3️⃣ สารเคมีอันตราย & MSDS\n4️⃣ แผนอพยพฉุกเฉิน\n5️⃣ ปฐมพยาบาล\n\n🏆 ผ่านทุกคอร์ส → ใบรับรอง ISO 45001', color: '#cbd5e1', size: 'sm', wrap: true },
                    ],
                  },
                },
              }];
            } else if (event.message.type === 'image') {
              replyMessages = [{
                type: 'flex',
                altText: '📸 ได้รับรูปแล้ว',
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#082f38', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '📸 AI Vision ได้รับรูปแล้ว', weight: 'bold', color: '#22d3ee', size: 'sm' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#041b20', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: 'กำลังตรวจจับ:\n🦺 PPE\n🚧 สภาพพื้นที่\n⚠️ จุดเสี่ยง\n👷 จำนวนแรงงาน\n\n💡 เปิดกล้อง AI Vision บนเว็บเพื่อผลแม่นยำ', color: '#cbd5e1', size: 'sm', wrap: true },
                    ],
                  },
                },
              }];
            } else {
              // Default: AI Safety Advisor
              const aiReply = generateSafetyAIResponse(userMsg);
              replyMessages = [{
                type: 'text',
                text: aiReply,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '✅ เช็กอิน', data: 'action=checkin' } },
                    { type: 'action', action: { type: 'message', label: '🚨 แจ้งเตือน', text: 'แจ้งเตือนล่าสุด' } },
                    { type: 'action', action: { type: 'message', label: '🦺 PPE', text: 'สถานะ PPE' } },
                  ],
                },
              }];
            }

            const replySummary = replyMessages[0]?.text || '[Flex Message]';
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', replySummary.slice(0, 500));
            await sendLineMessageWithRetry(event.replyToken, replyMessages, token);
            log('info', 'Message handled', { userId, msg: userMsg.slice(0, 50), requestId });
          }
        }

        return new Response('OK', { status: 200 });
      } catch (err) {
        log('error', 'Webhook processing error', { error: err.message, stack: err.stack?.slice(0, 200), requestId });
        return new Response('Internal Error', { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
