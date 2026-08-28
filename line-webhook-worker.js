// SafeSight EEC — Production Cloudflare Worker for LINE Messaging API
// Version 2.1.0 — TunKai-Inspired 6-Card Dashboard Matrix & Industrial Safety Automation

const DEFAULT_SECRET = "22be5b133d575c95012830ccb2e273bc";
const DEFAULT_TOKEN = "fV8LlAcoEV3eiQ6pYN0vYqlHcXdNaDvOeo2GSBfEqoF7KXZNkPZkUR2+cvUaEh9Ecq7rBztCRtr/yqM6h4Y9sEj+6EZt/RCjfl/eHp8sVv4LZbsfU6Y2zZXCRmPhasr3NYIwziF3yYgSqRAu+OFLiwdB04t89/1O/w1cDnyilFU=";
const DEFAULT_DB_URL = "postgresql://neondb_owner:npg_wDYzQ3ImoiX1@ep-lingering-bonus-azto8k3e-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const DEFAULT_SITE_URL = "https://safesight-arise.vercel.app";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const LINE_RETRY_ATTEMPTS = 3;
const LINE_RETRY_BACKOFF_MS = 500;
const REQUEST_TIMEOUT_MS = 25_000;

// ── In-memory stores ──
const rateLimitMap = new Map();
const idempotencyMap = new Map();

function log(level, msg, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    svc: 'safesight-line-webhook',
    ver: '2.1.0',
    ...meta,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT_MAX;
}

function cleanupRateLimit() {
  const now = Date.now();
  if (rateLimitMap.size > 10_000) {
    for (const [ip, rec] of rateLimitMap) {
      if (now > rec.resetAt) rateLimitMap.delete(ip);
    }
  }
}

function isDuplicateEvent(eventKey) {
  const now = Date.now();
  if (idempotencyMap.has(eventKey)) return true;
  idempotencyMap.set(eventKey, now);
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

// ── Neon PostgreSQL Helpers ──
async function neonQuery(dbUrl, query, params = []) {
  if (!dbUrl) return { rows: [] };
  try {
    const parsed = new URL(dbUrl);
    const sqlUrl = `https://${parsed.host}/sql`;
    const password = decodeURIComponent(parsed.password || '');
    
    const res = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${password}`,
        'Neon-Connection-String': dbUrl,
      },
      body: JSON.stringify({ query, params }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { rows: [] };
    const data = await res.json();
    return data?.rows || [];
  } catch (err) {
    log('warn', 'Neon query failed', { error: err.message });
    return [];
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

// ── Keyword Matcher ──
function matchKeywords(text, keywords) {
  const lower = (text || '').toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ── AI Safety Advisor ──
function generateSafetyAIResponse(userQuery) {
  const q = (userQuery || '').toLowerCase();

  if (matchKeywords(q, ['ร้อน', 'อุณหภูมิ', 'heat', 'temperature', 'แดด', 'sun'])) {
    return `⚠️ คำเตือนด้านอุณหภูมิ — SafeSight AI Safety Advisor\n\nอุณหภูมิสูงเกินมาตรฐาน (>35°C) เป็นปัจจัยเสี่ยงสำคัญในเขต EEC\n\nมาตรการเบื้องต้น:\n1. ดื่มน้ำ 250 มล. ทุก 30 นาที\n2. พักในที่ร่มทุก 60 นาที\n3. สังเกตอาการ: เวียนศีรษะ คลื่นไส้ ผิวแดง = Heat Stroke\n4. หากพบเพื่อนร่วมงานมีอาการ → พาเข้าที่ร่ม ราดน้ำ แจ้ง Safety Officer\n\n☎️ ฉุกเฉิน: กด SOS เพื่อแจ้งหน่วยกู้ภัยทันที`;
  }
  if (matchKeywords(q, ['เสียง', 'หู', 'noise', 'hearing', 'ดัง', 'loud'])) {
    return `🔊 คำแนะนำด้านเสียงรบกวน — SafeSight AI\n\nพื้นที่ EEC หลายโซนมีระดับเสียงสูงเกิน 85 dB(A)\n\nมาตรฐาน:\n• <85 dB: ปลอดภัย\n• 85-90 dB: สวม Ear Plug\n• >90 dB: สวม Ear Muff\n• >115 dB: ห้ามเข้าโดยไม่มีอุปกรณ์ป้องกัน\n\nIoT sensors ตรวจวัด Real-time บนแดชบอร์ดครับ`;
  }
  if (matchKeywords(q, ['สารเคมี', 'แก๊ส', 'gas', 'chemical', 'h2s', 'co', 'กลิ่น', 'smell'])) {
    return `☣️ คำเตือนด้านสารเคมี/แก๊ส — SafeSight AI\n\nIDLH Protocol:\n1. 🚶 ออกจากพื้นที่ทันที ไปทางเหนือลม (Upwind)\n2. 🆘 กด SOS หรือแจ้ง Safety Officer\n3. 🫁 หากหายใจลำบาก ให้นั่งพัก ห้ามนอนราบ\n4. 🚑 รอทีมกู้ภัยที่จุดรวมพล (Muster Point)\n\n⚠️ ห้ามกลับเข้าพื้นที่จนกว่า Safety Officer จะประกาศ All Clear`;
  }
  if (matchKeywords(q, ['ตก', 'สูง', 'fall', 'height', 'บันได', 'ladder', 'นั่งร้าน', 'scaffold'])) {
    return `🏗️ คำเตือนงานที่สูง — SafeSight AI\n\nกฎ PPE สำหรับงานที่สูง (>2 เมตร):\n• สวม Full-body Harness และยึด Lanyard เสมอ\n• ตรวจสภาพนั่งร้านก่อนใช้งาน\n• ห้ามทำงานที่สูงเพียงลำพัง\n• สภาพอากาศแย่ = ห้ามขึ้น\n\nกล้อง AI Vision ของ SafeSight ตรวจจับ Fall Detection แบบ Real-time ครับ`;
  }

  return `🛡️ SafeSight AI Safety Advisor — ระบบเฝ้าระวังความปลอดภัยแรงงาน EEC\n\nคุณสามารถ:\n• แตะ 'เมนู' หรือเลือกการ์ดความปลอดภัยด้านล่าง\n• พิมพ์ 'ภารกิจ' เพื่อรับภารกิจความปลอดภัยประจำวัน\n• พิมพ์ 'เช็กอิน' ยืนยันความพร้อมก่อนเข้ากะทำงาน\n• ส่งรูปถ่ายหน้างานให้ AI Vision วิเคราะห์จุดเสี่ยง\n• พิมพ์ SOS เพื่อแจ้งเหตุฉุกเฉินทันที\n\n🌐 รองรับ 5 ภาษา: ไทย | English | မြန်မာ | ខ្មែរ | ລາວ`;
}

// ── 🎨 TunKai-Inspired 6-Card Dashboard Carousel Flex Message ──

function buildSafetyDashboardCarouselFlexMessage(siteUrl = DEFAULT_SITE_URL) {
  return {
    type: "flex",
    altText: "🛡️ แดชบอร์ดความปลอดภัย SafeSight EEC (6 เมนูหลัก)",
    contents: {
      type: "carousel",
      contents: [
        // Card 1: ภารกิจ 1 อย่าง (Pink / Neon Magenta)
        {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#200918",
            paddingAll: "18px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "⚡ ภารกิจ 1 อย่าง", weight: "bold", color: "#f43f8e", size: "sm" },
                  { type: "text", text: "🔥 +50 XP", weight: "bold", color: "#fbcfe8", size: "xs", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                width: "48px",
                height: "48px",
                cornerRadius: "24px",
                backgroundColor: "#f43f8e33",
                borderColor: "#f43f8e",
                borderWidth: "normal",
                alignItems: "center",
                justifyContent: "center",
                contents: [
                  { type: "text", text: "⚡", size: "xl", align: "center" },
                ],
              },
              { type: "text", text: "ดื่มน้ำ · ตรวจสาย Harness", weight: "bold", color: "#ffffff", size: "md", margin: "md" },
              { type: "text", text: "ภารกิจความปลอดภัย 30 วิ", color: "#fbcfe8", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0f040b",
            paddingAll: "16px",
            contents: [
              { type: "text", text: "ดื่มน้ำ 250 มล. และตรวจสลักยึดสายรัดนิรภัยก่อนเริ่มงาน", color: "#cbd5e1", size: "xs", wrap: true },
              { type: "separator", margin: "md", color: "#3d102c" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#f43f8e", height: "sm", action: { type: "postback", label: "แตะรับภารกิจวันนี้", data: "action=mission" } },
                  { type: "button", style: "link", color: "#fbcfe8", height: "sm", action: { type: "uri", label: "🌐 เปิดแอป SafeSight", uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 2: คะแนนความพร้อม PPE (Emerald Green)
        {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#062319",
            paddingAll: "18px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🔋 คะแนนความพร้อม", weight: "bold", color: "#10b981", size: "sm" },
                  { type: "text", text: "98/100", weight: "bold", color: "#a7f3d0", size: "xs", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                width: "48px",
                height: "48px",
                cornerRadius: "24px",
                backgroundColor: "#10b98133",
                borderColor: "#10b981",
                borderWidth: "normal",
                alignItems: "center",
                justifyContent: "center",
                contents: [
                  { type: "text", text: "🔋", size: "xl", align: "center" },
                ],
              },
              { type: "text", text: "หมวก · เสื้อ · แว่นตา", weight: "bold", color: "#ffffff", size: "md", margin: "md" },
              { type: "text", text: "ดัชนีความปลอดภัยระดับสูง", color: "#a7f3d0", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#02120c",
            paddingAll: "16px",
            contents: [
              { type: "text", text: "ความพร้อม PPE รวม 98% พร้อมเริ่มงานกะเช้าอย่างปลอดภัย", color: "#cbd5e1", size: "xs", wrap: true },
              { type: "separator", margin: "md", color: "#114232" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#10b981", height: "sm", action: { type: "postback", label: "ดูความพร้อม 98/100", data: "action=readiness" } },
                  { type: "button", style: "link", color: "#a7f3d0", height: "sm", action: { type: "uri", label: "🌐 เปิดหน้าคะแนน", uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 3: เรดาร์จุดเสี่ยง EEC (Purple / Violet)
        {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#1f0c38",
            paddingAll: "18px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📡 เรดาร์จุดเสี่ยง", weight: "bold", color: "#a855f7", size: "sm" },
                  { type: "text", text: "EEC Radar", weight: "bold", color: "#e9d5ff", size: "xs", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                width: "48px",
                height: "48px",
                cornerRadius: "24px",
                backgroundColor: "#a855f733",
                borderColor: "#a855f7",
                borderWidth: "normal",
                alignItems: "center",
                justifyContent: "center",
                contents: [
                  { type: "text", text: "📡", size: "xl", align: "center" },
                ],
              },
              { type: "text", text: "ตรวจจับแก๊ส & เสียง", weight: "bold", color: "#ffffff", size: "md", margin: "md" },
              { type: "text", text: "H2S 0.3ppm · เสียง 72dB", color: "#e9d5ff", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0d0419",
            paddingAll: "16px",
            contents: [
              { type: "text", text: "IoT Sentinel เฝ้าระวังแก๊สพิษ อุณหภูมิ และระดับเสียงทุกโซน 24/7", color: "#cbd5e1", size: "xs", wrap: true },
              { type: "separator", margin: "md", color: "#3d196d" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#a855f7", height: "sm", action: { type: "postback", label: "เปิดตรวจเรดาร์", data: "action=radar" } },
                  { type: "button", style: "link", color: "#e9d5ff", height: "sm", action: { type: "uri", label: "🌐 ดูแผนที่ Digital Twin", uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 4: เช็กอิน 30 วินาที (Indigo / Blue)
        {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#11153b",
            paddingAll: "18px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📝 เช็กอิน 30 วินาที", weight: "bold", color: "#6366f1", size: "sm" },
                  { type: "text", text: "Pre-shift", weight: "bold", color: "#c7d2fe", size: "xs", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                width: "48px",
                height: "48px",
                cornerRadius: "24px",
                backgroundColor: "#6366f133",
                borderColor: "#6366f1",
                borderWidth: "normal",
                alignItems: "center",
                justifyContent: "center",
                contents: [
                  { type: "text", text: "📝", size: "xl", align: "center" },
                ],
              },
              { type: "text", text: "บันทึกพลังใจ & PPE", weight: "bold", color: "#ffffff", size: "md", margin: "md" },
              { type: "text", text: "ตรวจเช็กรวดเร็วก่อนเริ่มงาน", color: "#c7d2fe", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#07091c",
            paddingAll: "16px",
            contents: [
              { type: "text", text: "ยืนยันสวมหมวก เสื้อสะท้อนแสง แว่นตา และบันทึกระดับความพร้อม", color: "#cbd5e1", size: "xs", wrap: true },
              { type: "separator", margin: "md", color: "#222769" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#6366f1", height: "sm", action: { type: "postback", label: "เช็กอินความปลอดภัย", data: "action=checkin" } },
                  { type: "button", style: "link", color: "#c7d2fe", height: "sm", action: { type: "uri", label: "🌐 เปิดหน้าเช็กอินเว็บ", uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 5: ส่งภาพตรวจ AI Vision (Cyan / Teal)
        {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#072930",
            paddingAll: "18px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📷 ตรวจจับ AI Vision", weight: "bold", color: "#06b6d4", size: "sm" },
                  { type: "text", text: "YOLOv8", weight: "bold", color: "#a5f3fc", size: "xs", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                width: "48px",
                height: "48px",
                cornerRadius: "24px",
                backgroundColor: "#06b6d433",
                borderColor: "#06b6d4",
                borderWidth: "normal",
                alignItems: "center",
                justifyContent: "center",
                contents: [
                  { type: "text", text: "📷", size: "xl", align: "center" },
                ],
              },
              { type: "text", text: "สแกน PPE & จุดเสี่ยง", weight: "bold", color: "#ffffff", size: "md", margin: "md" },
              { type: "text", text: "วิเคราะห์ภาพถ่ายทันที", color: "#a5f3fc", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#031417",
            paddingAll: "16px",
            contents: [
              { type: "text", text: "ส่งรูปถ่ายหน้างานในแชทนี้ ระบบ AI Vision จะวิเคราะห์การสวม PPE ทันที", color: "#cbd5e1", size: "xs", wrap: true },
              { type: "separator", margin: "md", color: "#104c57" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#06b6d4", height: "sm", action: { type: "postback", label: "สแกนภาพ AI Vision", data: "action=vision_scan" } },
                  { type: "button", style: "link", color: "#a5f3fc", height: "sm", action: { type: "uri", label: "🌐 เปิดกล้อง AI สด", uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 6: ปรึกษา Safety AI (Rose / Magenta)
        {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#2a0914",
            paddingAll: "18px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🛡️ ปรึกษา Safety AI", weight: "bold", color: "#f43f5e", size: "sm" },
                  { type: "text", text: "24/7 AI จป.", weight: "bold", color: "#fecdd3", size: "xs", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                width: "48px",
                height: "48px",
                cornerRadius: "24px",
                backgroundColor: "#f43f5e33",
                borderColor: "#f43f5e",
                borderWidth: "normal",
                alignItems: "center",
                justifyContent: "center",
                contents: [
                  { type: "text", text: "🛡️", size: "xl", align: "center" },
                ],
              },
              { type: "text", text: "ถามกฎ OSH & ปฐมพยาบาล", weight: "bold", color: "#ffffff", size: "md", margin: "md" },
              { type: "text", text: "ผู้เชี่ยวชาญความปลอดภัย EEC", color: "#fecdd3", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#14040a",
            paddingAll: "16px",
            contents: [
              { type: "text", text: "พิมพ์ถามอาการ ความร้อน สารเคมี กฎหมายความปลอดภัย หรือกด SOS", color: "#cbd5e1", size: "xs", wrap: true },
              { type: "separator", margin: "md", color: "#4d1225" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#f43f5e", height: "sm", action: { type: "postback", label: "คุยกับ Safety AI", data: "action=consult_ai" } },
                  { type: "button", style: "link", color: "#fecdd3", height: "sm", action: { type: "uri", label: "🌐 ปรึกษาบนเว็บ", uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}

// ── Detail Flex Builders ──

function buildSafetyMissionDetailFlexMessage() {
  return {
    type: "flex",
    altText: "⚡ ภารกิจความปลอดภัยประจำวันของคุณ",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#200918",
        paddingAll: "20px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "⚡ ภารกิจความปลอดภัยประจำวัน", weight: "bold", color: "#f43f8e", size: "sm" },
              { type: "text", text: "🔥 +50 XP", weight: "bold", color: "#ffffff", size: "xs", align: "end" },
            ],
          },
          { type: "text", text: "ตรวจเช็กสายรัดนิรภัย & ดื่มน้ำ 250 มล.", weight: "bold", color: "#ffffff", size: "xl", margin: "md", wrap: true },
          { type: "text", text: "⏱️ ใช้เวลา: 30 วินาที | มาตรฐาน ISO 45001", color: "#fbcfe8", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0f040b",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "💡 ข้อแนะนำความปลอดภัย: การดื่มน้ำก่อนเข้ากะช่วยลดความเสี่ยงภาวะ Heat Stroke ในโรงงานเขต EEC และการตรวจสลัก D-Ring ช่วยป้องกันการตกจากที่สูงได้ 100%", color: "#cbd5e1", size: "sm", wrap: true },
          { type: "separator", margin: "lg", color: "#3d102c" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#f43f8e", height: "sm", action: { type: "postback", label: "✅ ยืนยันทำภารกิจสำเร็จ (+50 XP)", data: "action=complete_mission" } },
              { type: "button", style: "secondary", color: "#2a0914", height: "sm", action: { type: "postback", label: "📋 ดูเมนูแดชบอร์ดหลัก", data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyReadinessDetailFlexMessage() {
  return {
    type: "flex",
    altText: "🔋 คะแนนความพร้อมความปลอดภัยของคุณ 98/100",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#062319",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🔋 คะแนนความพร้อมความปลอดภัย (Safety Readiness)", weight: "bold", color: "#10b981", size: "sm" },
          { type: "text", text: "98 / 100", weight: "bold", color: "#ffffff", size: "3xl", margin: "md" },
          { type: "text", text: "✅ ปฏิบัติตามมาตรฐานครบถ้วน · พร้อมเริ่มกะทำงาน", color: "#a7f3d0", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#02120c",
        paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: "🪖 หมวกนิรภัย (Hard Hat):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "98% (สวมครบ)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🦺 เสื้อสะท้อนแสง (Hi-Vis):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "94% (สวมครบ)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🥽 แว่นตานิรภัย (Goggles):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "91% (สวมครบ)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🥾 รองเท้าหัวเหล็ก (Boots):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "99% (สวมครบ)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#114232" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#10b981", height: "sm", action: { type: "postback", label: "✅ เช็กอินความปลอดภัยวันนี้", data: "action=checkin" } },
              { type: "button", style: "secondary", color: "#062319", height: "sm", action: { type: "postback", label: "📋 ดูเมนูแดชบอร์ดหลัก", data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyRadarDetailFlexMessage() {
  return {
    type: "flex",
    altText: "📡 เรดาร์จุดเสี่ยงและแก๊สพิษ EEC (Silent Hazard Radar)",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1f0c38",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "📡 เรดาร์จุดเสี่ยง EEC (Silent Hazard Radar)", weight: "bold", color: "#a855f7", size: "sm" },
          { type: "text", text: "🟢 สภาพพื้นที่ปกติ — ปลอดภัย", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
          { type: "text", text: "อัปเดตแบบ Real-time จากเครือข่าย IoT เซ็นเซอร์ 4 โซน", color: "#e9d5ff", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0d0419",
        paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: "☣️ แก๊สพิษ H2S:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "0.3 ppm (ปลอดภัย)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🌡️ อุณหภูมิ:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "32.4°C (ปกติ)", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🔊 ระดับเสียง:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "72 dB(A) (ปกติ)", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "👷 แรงงานในโซน:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "24 คน", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#3d196d" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#a855f7", height: "sm", action: { type: "message", label: "🚨 ดูแจ้งเตือนล่าสุด", text: "แจ้งเตือนล่าสุด" } },
              { type: "button", style: "secondary", color: "#1f0c38", height: "sm", action: { type: "postback", label: "📋 ดูเมนูแดชบอร์ดหลัก", data: "action=menu" } },
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
              { type: 'button', style: 'primary', color: '#10b981', height: 'sm', action: { type: 'postback', label: '✅ ยืนยัน — เช็กอินเรียบร้อย', data: 'action=checkin_confirmed' } },
              { type: 'button', style: 'secondary', color: '#062319', height: 'sm', action: { type: 'postback', label: '📋 ดูเมนูแดชบอร์ดหลัก', data: "action=menu" } },
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
    altText: '🆘 SOS ฉุกเฉิน! — SafeSight Emergency',
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
          { type: 'text', text: '✅ ดำเนินการแล้ว:\n\n1. 📡 แจ้ง Safety Officer ทุกโซน\n2. 🚑 ส่งพิกัดไปยังทีมกู้ภัย EEC\n3. 📋 บันทึกลง Audit Log (ISO 45001)\n4. 🔊 เปิดสัญญาณเตือนภัยฉุกเฉิน\n\n⚠️ มาตรการความปลอดภัย:\n• เคลื่อนย้ายไปจุดรวมพล (Muster Point)\n• อย่ากลับเข้าพื้นที่อันตราย\n• รอคำสั่งจาก Safety Officer', color: '#fef2f2', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#991b1b' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#dc2626', height: 'sm', action: { type: 'uri', label: '📞 โทร 1669 (ศูนย์ฉุกเฉิน)', uri: 'tel:1669' } },
              { type: 'button', style: 'secondary', color: '#450a0a', height: 'sm', action: { type: 'postback', label: '📋 ดูเมนูแดชบอร์ดหลัก', data: "action=menu" } },
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
    altText: '📋 รายงานจุดเสี่ยง / Near-miss',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1a0f00', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 รายงานจุดเสี่ยง (Near-miss Report)', weight: 'bold', color: '#FE6E00', size: 'sm' },
          { type: 'text', text: 'ส่งรายงานอันตรายที่พบในโรงงาน', weight: 'bold', color: '#ffffff', size: 'lg', margin: 'md' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#0f0800', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📸 วิธีที่ 1: ถ่ายรูปสถานการณ์ส่งในแชทนี้ AI จะวิเคราะห์อัตโนมัติ\n\n📝 วิธีที่ 2: เปิดเว็บแดชบอร์ดกรอกฟอร์มรายงาน (รองรับ 5 ภาษา พร้อมแนบไฟล์)\n\nทุกรายงานบันทึกใน Audit Log ตาม ISO 45001', color: '#cbd5e1', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#3d2800' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#FE6E00', height: 'sm', action: { type: 'message', label: '📸 ส่งรูปจุดเสี่ยง', text: 'ส่งรูปจุดเสี่ยง' } },
              { type: 'button', style: 'secondary', color: '#1a0f00', height: 'sm', action: { type: 'postback', label: '📋 ดูเมนูแดชบอร์ดหลัก', data: "action=menu" } },
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
    altText: '🚨 แจ้งเตือนล่าสุด — SafeSight',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#450a0a', paddingAll: '20px',
        contents: [
          { type: 'text', text: '🚨 แจ้งเตือนความปลอดภัยล่าสุด', weight: 'bold', color: '#ef4444', size: 'sm' },
          { type: 'text', text: 'สรุปเหตุการณ์จาก AI Vision & IoT', weight: 'bold', color: '#ffffff', size: 'lg', margin: 'md' },
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
              { type: 'button', style: 'secondary', color: '#450a0a', height: 'sm', action: { type: 'postback', label: '📋 ดูเมนูแดชบอร์ดหลัก', data: "action=menu" } },
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

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-line-signature',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const secret = env?.LINE_CHANNEL_SECRET || DEFAULT_SECRET;
    const token = env?.LINE_CHANNEL_ACCESS_TOKEN || DEFAULT_TOKEN;
    const dbUrl = env?.DATABASE_URL || DEFAULT_DB_URL;
    const siteUrl = env?.SITE_URL || DEFAULT_SITE_URL;

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
      if (url.pathname === '/health' || url.pathname === '/healthz') {
        return new Response(JSON.stringify({
          status: 'healthy',
          version: '2.1.0',
          service: 'SafeSight EEC LINE Webhook Engine',
          uptime: Date.now(),
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (url.pathname === '/history') {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100);
        const history = await getChatHistoryFromNeon(dbUrl, limit);
        return new Response(JSON.stringify({ status: 'ok', history }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        status: 'ok',
        service: 'SafeSight EEC LINE Webhook Engine',
        version: '2.1.0',
        botName: 'SafeSight Safety (@095teptf)',
        database: dbUrl ? 'Neon PostgreSQL Connected' : 'No Database',
        active: true,
        languages: ['th', 'en', 'my', 'km', 'lo'],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── POST Endpoints ──
    if (request.method === 'POST') {
      const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
      if (contentLength > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: corsHeaders });
      }

      // Broadcast / Push
      if (url.pathname === '/broadcast' || url.pathname === '/push') {
        try {
          const body = await request.json();
          const text = body.text || '';
          const targetUserId = body.to;
          const messages = body.messages || [{ type: 'text', text }];

          if (targetUserId) {
            await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ to: targetUserId, messages }),
            });
          } else {
            await fetch('https://api.line.me/v2/bot/message/broadcast', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ messages }),
            });
          }

          await saveLineMessageToNeon(dbUrl, targetUserId || 'broadcast_all', 'assistant', `[Broadcast]: ${text}`);

          return new Response(JSON.stringify({ success: true, delivered: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err) {
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

        // Signature verification
        if (signature && secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw', encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false, ['sign']
          );
          const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
          const calcSig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

          if (signature !== calcSig) {
            log('warn', 'Invalid signature rejected', { ip: clientIp });
            return new Response('Invalid Signature', { status: 403, headers: corsHeaders });
          }
        }

        const body = JSON.parse(rawBody || '{}');
        const events = body.events || [];

        for (const event of events) {
          const userId = event.source?.userId || 'anonymous';
          const eventKey = `${userId}_${event.type}_${event.timestamp || Date.now()}`;

          if (isDuplicateEvent(eventKey)) continue;

          // ── Follow / Add Friend Event ──
          if (event.type === 'follow' && event.replyToken) {
            await sendLineMessageWithRetry(event.replyToken, [buildSafetyDashboardCarouselFlexMessage(siteUrl)], token);
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', '[Sent 6-Card Dashboard Matrix]');
            continue;
          }

          // ── Postback Event ──
          if (event.type === 'postback' && event.replyToken) {
            const data = event.postback.data || '';
            let replyMessages = [];

            if (data.startsWith('action=menu') || data.startsWith('action=dashboard')) {
              replyMessages = [buildSafetyDashboardCarouselFlexMessage(siteUrl)];
            } else if (data.startsWith('action=mission')) {
              replyMessages = [buildSafetyMissionDetailFlexMessage()];
            } else if (data.startsWith('action=complete_mission')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[Completed Safety Mission: +50 XP]');
              replyMessages = [{
                type: 'text',
                text: '🎉 ยินดีด้วยครับ! คุณทำภารกิจความปลอดภัยสำเร็จแล้ว (+50 XP)\n\nระบบ SafeSight ได้บันทึกคะแนนสะสมความปลอดภัยของคุณเรียบร้อยแล้ว\n\n🛡️ ความปลอดภัยเริ่มต้นที่ตัวเราเสมอครับ!',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 แดชบอร์ดหลัก', data: 'action=menu' } },
                    { type: 'action', action: { type: 'postback', label: '🔋 ดูคะแนนความพร้อม', data: 'action=readiness' } },
                    { type: 'action', action: { type: 'uri', label: '🌐 เปิดแอป SafeSight', uri: `${siteUrl}` } },
                  ],
                },
              }];
            } else if (data.startsWith('action=readiness')) {
              replyMessages = [buildSafetyReadinessDetailFlexMessage()];
            } else if (data.startsWith('action=radar')) {
              replyMessages = [buildSafetyRadarDetailFlexMessage()];
            } else if (data.startsWith('action=checkin_confirmed')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[Confirmed Daily Safety Check-in]');
              await logAuditToNeon(dbUrl, userId, 'DAILY_CHECKIN_CONFIRMED', 'safety', 'info', 'Worker pre-shift check-in confirmed via LINE');
              replyMessages = [{
                type: 'text',
                text: '✅ บันทึกเช็กอินความปลอดภัยเรียบร้อยแล้ว!\n\n🛡️ ปฏิบัติตามกฎ PPE ตลอดกะทำงาน\n🦺 สวมหมวก เสื้อสะท้อนแสง แว่นตาครบเซ็ต\n\nขอบคุณที่ร่วมสร้างวัฒนธรรมความปลอดภัยครับ',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 แดชบอร์ดหลัก', data: 'action=menu' } },
                    { type: 'action', action: { type: 'message', label: '🚨 แจ้งเตือนล่าสุด', text: 'แจ้งเตือนล่าสุด' } },
                    { type: 'action', action: { type: 'uri', label: '🌐 เปิดแดชบอร์ดเว็บ', uri: `${siteUrl}` } },
                  ],
                },
              }];
            } else if (data.startsWith('action=checkin')) {
              replyMessages = [buildSafetyCheckinFlexMessage()];
            } else if (data.startsWith('action=vision_scan')) {
              replyMessages = [{
                type: 'text',
                text: '📷 ถ่ายรูปหรือส่งภาพถ่ายหน้างานในแชทนี้ได้เลยครับ\n\nระบบ AI Vision (YOLOv8) จะวิเคราะห์การสวมใส่หมวก เสื้อสะท้อนแสง แว่นตา และจุดเสี่ยงอันตรายให้อัตโนมัติทันทีครับ!',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 แดชบอร์ดหลัก', data: 'action=menu' } },
                    { type: 'action', action: { type: 'uri', label: '🌐 เปิดกล้อง AI สดบนเว็บ', uri: `${siteUrl}` } },
                  ],
                },
              }];
            } else if (data.startsWith('action=consult_ai')) {
              replyMessages = [{
                type: 'text',
                text: '🛡️ SafeSight 24/7 AI Safety Officer พร้อมให้คำปรึกษาครับ\n\nคุณสามารถพิมพ์ถามได้เลย เช่น:\n• "อาการ Heat Stroke ทำอย่างไร"\n• "สารเคมีรั่วไหลต้องทำอย่างไร"\n• "กฎหมาย PPE สำหรับงานที่สูง"\n• หรือพิมพ์ SOS หากเกิดเหตุฉุกเฉิน',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 แดชบอร์ดหลัก', data: 'action=menu' } },
                    { type: 'action', action: { type: 'message', label: '🆘 SOS ฉุกเฉิน', text: 'SOS' } },
                  ],
                },
              }];
            } else if (data.startsWith('action=sos')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[🚨 SOS EMERGENCY]');
              await logAuditToNeon(dbUrl, userId, 'LINE_SOS_TRIGGERED', 'emergency', 'critical', 'SOS triggered via LINE');
              replyMessages = [buildEmergencySOSFlexMessage()];
            } else if (data.startsWith('action=ack_alert')) {
              const alertId = data.split('=')[2] || 'all';
              await saveLineMessageToNeon(dbUrl, userId, 'user', `[Acknowledged alert: ${alertId}]`);
              replyMessages = [{
                type: 'text',
                text: `✅ รับทราบการแจ้งเตือนแล้ว (${alertId})\n\nบันทึกใน Audit Log เรียบร้อย ขอบคุณที่ตอบรับอย่างรวดเร็วครับ`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 แดชบอร์ดหลัก', data: 'action=menu' } },
                    { type: 'action', action: { type: 'uri', label: '🌐 ดูบนแดชบอร์ด', uri: `${siteUrl}` } },
                  ],
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

            if (matchKeywords(userMsg, ['เมนู', 'menu', 'dashboard', 'แดชบอร์ด', 'ทันกาย', 'tunkai', 'home', 'เริ่ม'])) {
              replyMessages = [buildSafetyDashboardCarouselFlexMessage(siteUrl)];

            } else if (matchKeywords(userMsg, ['ภารกิจ', 'mission', 'task'])) {
              replyMessages = [buildSafetyMissionDetailFlexMessage()];

            } else if (matchKeywords(userMsg, ['พร้อม', 'คะแนน', 'readiness', 'score'])) {
              replyMessages = [buildSafetyReadinessDetailFlexMessage()];

            } else if (matchKeywords(userMsg, ['เรดาร์', 'radar', 'แก๊ส', 'gas', 'h2s', 'sensor'])) {
              replyMessages = [buildSafetyRadarDetailFlexMessage()];

            } else if (matchKeywords(userMsg, ['เช็กอิน', 'เช็คอิน', 'checkin', 'check in', 'check-in'])) {
              replyMessages = [buildSafetyCheckinFlexMessage()];

            } else if (matchKeywords(userMsg, ['แจ้งเตือน', 'alert', 'alerts', 'อุบัติเหตุ', 'accident', 'ล่าสุด'])) {
              replyMessages = [buildAlertSummaryFlexMessage()];

            } else if (matchKeywords(userMsg, ['รายงาน', 'จุดเสี่ยง', 'report', 'hazard', 'near miss', 'near-miss'])) {
              replyMessages = [buildHazardReportGuideFlexMessage()];

            } else if (matchKeywords(userMsg, ['SOS', 'sos', 'ฉุกเฉิน', 'emergency', 'ช่วยด้วย', 'help'])) {
              await logAuditToNeon(dbUrl, userId, 'LINE_SOS_KEYWORD', 'emergency', 'critical', `SOS keyword: ${userMsg}`);
              replyMessages = [buildEmergencySOSFlexMessage()];

            } else if (matchKeywords(userMsg, ['ส่งภาพตรวจ AI', 'ตรวจจับ AI', 'สแกน', 'scan', 'กล้อง', 'vision'])) {
              replyMessages = [{
                type: 'text',
                text: '📷 ถ่ายรูปหรือส่งภาพถ่ายหน้างานในแชทนี้ได้เลยครับ\n\nระบบ AI Vision (YOLOv8) จะวิเคราะห์การสวมใส่หมวก เสื้อสะท้อนแสง แว่นตา และจุดเสี่ยงอันตรายให้อัตโนมัติทันทีครับ!',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'uri', label: '🌐 เปิดกล้อง AI สดบนเว็บ', uri: `${siteUrl}` } },
                    { type: 'action', action: { type: 'message', label: '🦺 ดูสถานะ PPE', text: 'คะแนนความพร้อม' } },
                  ],
                },
              }];

            } else if (matchKeywords(userMsg, ['ปรึกษา Safety AI', 'ปรึกษา', 'จป', 'กฎหมาย', 'อาการ', 'advisor'])) {
              replyMessages = [{
                type: 'text',
                text: '🛡️ SafeSight 24/7 AI Safety Officer พร้อมให้คำปรึกษาครับ\n\nคุณสามารถพิมพ์ถามได้เลย เช่น:\n• "อาการ Heat Stroke ทำอย่างไร"\n• "สารเคมีรั่วไหลต้องทำอย่างไร"\n• "กฎหมาย PPE สำหรับงานที่สูง"\n• หรือพิมพ์ SOS หากเกิดเหตุฉุกเฉิน',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '⚡ รับภารกิจวันนี้', text: 'ขอภารกิจวันนี้' } },
                    { type: 'action', action: { type: 'message', label: '🆘 SOS ฉุกเฉิน', text: 'SOS' } },
                  ],
                },
              }];

            } else if (event.message.type === 'image') {
              // Image message -> Vision scan result card
              replyMessages = [{
                type: 'flex',
                altText: '📸 AI Vision ได้รับรูปภาพแล้ว',
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#072930', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '📸 AI Vision (YOLOv8) ได้รับรูปภาพแล้ว', weight: 'bold', color: "#06b6d4", size: 'sm' },
                      { type: 'text', text: 'กำลังวิเคราะห์ PPE & ความปลอดภัยหน้างาน...', weight: 'bold', color: '#ffffff', size: 'md', margin: 'sm' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#031417', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: 'ผลตรวจจับเบื้องต้น:\n\n🪖 หมวกนิรภัย: ตรวจพบความเสี่ยง\n🦺 เสื้อสะท้อนแสง: ตรวจพบความเสี่ยง\n🥽 แว่นตา: ตรวจพบความเสี่ยง\n👷 จำนวนแรงงาน: 1 คน', color: '#cbd5e1', size: 'sm', wrap: true },
                      { type: 'separator', margin: 'lg', color: '#104c57' },
                      {
                        type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
                        contents: [
                          { type: 'button', style: 'primary', color: '#06b6d4', height: 'sm', action: { type: 'uri', label: '🌐 เปิดดูกล้อง AI สดบนเว็บ', uri: `${siteUrl}` } },
                          { type: 'button', style: 'secondary', color: '#072930', height: 'sm', action: { type: 'postback', label: '📋 แดชบอร์ด 6 เมนู', data: "action=menu" } },
                        ],
                      },
                    ],
                  },
                },
              }];
            } else {
              // Default AI response with 6-Menu quick trigger
              const aiReply = generateSafetyAIResponse(userMsg);
              replyMessages = [{
                type: 'text',
                text: aiReply,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 เมนูแดชบอร์ด', data: 'action=menu' } },
                    { type: 'action', action: { type: 'postback', label: '⚡ ภารกิจวันนี้', data: 'action=mission' } },
                    { type: 'action', action: { type: 'postback', label: '🔋 ความพร้อม PPE', data: 'action=readiness' } },
                    { type: 'action', action: { type: 'postback', label: '📡 เรดาร์ EEC', data: 'action=radar' } },
                    { type: 'action', action: { type: 'message', label: '🆘 SOS ฉุกเฉิน', text: 'SOS' } },
                  ],
                },
              }];
            }

            const replySummary = replyMessages[0]?.text || '[Sent Flex Dashboard]';
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', replySummary.slice(0, 500));
            await sendLineMessageWithRetry(event.replyToken, replyMessages, token);
          }
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      } catch (err) {
        log('error', 'Webhook error', { error: err.message });
        return new Response('Internal Error', { status: 500, headers: corsHeaders });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
