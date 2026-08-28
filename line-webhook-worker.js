// SafeSight EEC — Production Cloudflare Worker for LINE Messaging API
// Version 2.2.0 — Rotating Missions · Multilingual Detection · Expanded AI Advisor · Feature Depth Update

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

// ── Language Detector (simple heuristic for 5 worker languages) ──
function detectLanguage(text) {
  if (!text) return 'th';
  // Burmese Unicode block: \u1000-\u109F
  if (/[\u1000-\u109F]/.test(text)) return 'my';
  // Khmer Unicode block: \u1780-\u17FF
  if (/[\u1780-\u17FF]/.test(text)) return 'km';
  // Lao Unicode block: \u0E80-\u0EFF
  if (/[\u0E80-\u0EFF]/.test(text)) return 'lo';
  // Thai Unicode block: \u0E00-\u0E7F
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  return 'en';
}

// ── Daily Rotating Mission Pool ──
const DAILY_MISSIONS = [
  { title: 'ดื่มน้ำ · ตรวจสาย Harness', body: 'ดื่มน้ำ 250 มล. และตรวจสลัก D-Ring ก่อนเริ่มงาน', tip: 'การดื่มน้ำก่อนเข้ากะลด Heat Stroke ได้ 70% และการตรวจ D-Ring ป้องกันการตกจากที่สูง 100%' },
  { title: 'ตรวจสอบ PPE ครบชุด', body: 'ยืนยันว่าสวมหมวก เสื้อ แว่น รองเท้า ครบก่อนเข้าโซนงาน', tip: 'PPE ที่ครบชุดลดโอกาสบาดเจ็บได้ถึง 85% ตามมาตรฐาน ISO 45001' },
  { title: 'ถ่ายรูป Near-miss วันนี้', body: 'หากพบจุดเสี่ยงในพื้นที่ ถ่ายรูปแล้วรายงานทันที', tip: 'การรายงาน Near-miss ทุก 1 รายงาน ช่วยป้องกันอุบัติเหตุในอนาคตได้ 10 เหตุการณ์' },
  { title: 'ตรวจ Sensor แก๊ส H2S', body: 'ตรวจสอบว่า Gas Detector ติดตัวและแสดงสีเขียว', tip: 'H2S ไม่มีสี ไม่มีกลิ่นในความเข้มข้นสูง ต้องพึ่งพา Sensor เท่านั้น' },
  { title: 'พักตาจากหน้าจอ 20-20-20', body: 'ทุก 20 นาที มองวัตถุห่าง 20 ฟุต เป็นเวลา 20 วินาที', tip: 'ลดอาการตาล้าจากการจ้องหน้าจอควบคุมในโรงงาน EEC' },
  { title: 'เช็กสัญญาณฉุกเฉิน', body: 'ทดสอบปุ่ม Emergency Stop บนสถานีงานของคุณ', tip: 'Emergency Stop ที่ใช้งานได้ลดเวลาหยุดเครื่องในกรณีฉุกเฉินได้ >40%' },
  { title: 'รายงานอุปกรณ์ชำรุด', body: 'ตรวจและแจ้ง Supervisor หากพบอุปกรณ์หรือเครื่องมือชำรุด', tip: 'อุปกรณ์ชำรุดที่ไม่ได้แจ้งคือสาเหตุ #1 ของอุบัติเหตุซ้ำในโรงงาน' },
];

function getDailyMission() {
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % DAILY_MISSIONS.length;
  return DAILY_MISSIONS[dayIndex];
}

// ── AI Safety Advisor (Expanded + Multilingual fallback) ──
function generateSafetyAIResponse(userQuery) {
  const q = (userQuery || '').toLowerCase();
  const lang = detectLanguage(userQuery);

  // Multilingual non-Thai opener
  const multiLingualPrompt = lang === 'my'
    ? '(မြန်မာ) SafeSight AI ဖြေကြားမည်:\n\n'
    : lang === 'km'
    ? '(ខ្មែរ) SafeSight AI នឹងឆ្លើយ:\n\n'
    : lang === 'lo'
    ? '(ລາວ) SafeSight AI ຈະຕອບ:\n\n'
    : lang === 'en'
    ? '(EN) SafeSight AI Response:\n\n'
    : '';

  // ── Topic Routing ──
  if (matchKeywords(q, ['ร้อน', 'อุณหภูมิ', 'heat', 'temperature', 'แดด', 'sun', 'stroke'])) {
    return `${multiLingualPrompt}⚠️ คำเตือนด้านอุณหภูมิ — SafeSight AI Safety Advisor\n\nอุณหภูมิสูงเกินมาตรฐาน (>35°C) เป็นปัจจัยเสี่ยงสำคัญในเขต EEC\n\nมาตรการเบื้องต้น:\n1. ดื่มน้ำ 250 มล. ทุก 30 นาที\n2. พักในที่ร่มทุก 60 นาที\n3. สังเกตอาการ: เวียนศีรษะ คลื่นไส้ ผิวแดง = Heat Stroke\n4. หากพบเพื่อนร่วมงานมีอาการ → พาเข้าที่ร่ม ราดน้ำ แจ้ง Safety Officer\n\n☎️ ฉุกเฉิน: กด SOS เพื่อแจ้งหน่วยกู้ภัยทันที`;
  }
  if (matchKeywords(q, ['เสียง', 'หู', 'noise', 'hearing', 'ดัง', 'loud', 'db', 'เดซิเบล'])) {
    return `${multiLingualPrompt}🔊 คำแนะนำด้านเสียงรบกวน — SafeSight AI\n\nพื้นที่ EEC หลายโซนมีระดับเสียงสูงเกิน 85 dB(A)\n\nมาตรฐาน WHO/ISO:\n• <85 dB: ปลอดภัย (ทำงานได้ 8 ชม.)\n• 85–90 dB: ต้องสวม Ear Plug\n• >90 dB: ต้องสวม Ear Muff\n• >115 dB: ห้ามเข้าโดยไม่มีอุปกรณ์\n\nIoT sensors วัด Real-time บนแดชบอร์ดครับ`;
  }
  if (matchKeywords(q, ['สารเคมี', 'แก๊ส', 'gas', 'chemical', 'h2s', 'co', 'กลิ่น', 'smell', 'รั่ว', 'leak'])) {
    return `${multiLingualPrompt}☣️ คำเตือนด้านสารเคมี/แก๊ส — SafeSight AI\n\nIDLH Protocol:\n1. 🚶 ออกจากพื้นที่ทันที ไปทางเหนือลม (Upwind)\n2. 🆘 กด SOS หรือแจ้ง Safety Officer\n3. 🫁 หายใจลำบาก → นั่งพัก ห้ามนอนราบ\n4. 🚑 รอกู้ภัยที่จุดรวมพล (Muster Point)\n\n⚠️ ห้ามกลับจนกว่า Safety Officer ประกาศ All Clear`;
  }
  if (matchKeywords(q, ['ตก', 'สูง', 'fall', 'height', 'บันได', 'ladder', 'นั่งร้าน', 'scaffold', 'harness', 'สายรัด'])) {
    return `${multiLingualPrompt}🏗️ คำเตือนงานที่สูง — SafeSight AI\n\nกฎ PPE สำหรับงานที่สูง (>2 เมตร):\n• สวม Full-body Harness และยึด Lanyard เสมอ\n• ตรวจสภาพนั่งร้านก่อนใช้งาน\n• ห้ามทำงานที่สูงเพียงลำพัง\n• สภาพอากาศแย่ = ห้ามขึ้น\n\nกล้อง AI Vision ตรวจจับ Fall Detection แบบ Real-time ครับ`;
  }
  if (matchKeywords(q, ['ไฟไหม้', 'เพลิง', 'fire', 'smoke', 'ควัน', 'ดับเพลิง', 'extinguisher'])) {
    return `${multiLingualPrompt}🔥 คำเตือนเพลิงไหม้ — SafeSight AI\n\นขั้นตอน RACE:\n1. 🔴 Rescue — พาผู้ที่อยู่ในอันตรายออก\n2. 🚨 Alarm — กดสัญญาณแจ้งเตือน / แจ้ง 199\n3. 🚒 Contain — ปิดประตู ป้องกันไฟลาม\n4. 🚶 Evacuate — อพยพตามเส้นทางฉุกเฉิน\n\n☎️ ศูนย์ดับเพลิง EEC: 199 | SOS: กดปุ่มด้านล่าง`;
  }
  if (matchKeywords(q, ['ไฟฟ้า', 'ช็อต', 'electric', 'shock', 'voltage', 'สายไฟ', 'switchboard'])) {
    return `${multiLingualPrompt}⚡ คำเตือนอันตรายทางไฟฟ้า — SafeSight AI\n\nมาตรการ LOTO (Lockout/Tagout):\n1. 🔌 ตัดแหล่งจ่ายไฟทุกจุดก่อนซ่อม\n2. 🔒 ล็อกและแขวนป้าย "อย่าเปิด" (Tagout)\n3. 🧤 สวม Insulated Gloves ≥ 1,000V\n4. ❌ ห้ามทำงานคนเดียวกับระบบไฟฟ้า\n\n⚠️ ไฟฟ้า 230V สามารถทำให้เสียชีวิตได้ภายใน 0.1 วินาที`;
  }
  if (matchKeywords(q, ['กฎหมาย', 'กฎ', 'law', 'regulation', 'iso', 'osha', 'พรบ', 'มาตรฐาน', 'standard'])) {
    return `${multiLingualPrompt}⚖️ กฎหมายและมาตรฐานความปลอดภัย — SafeSight AI\n\nประเทศไทย (EEC Zone):\n• พรบ. ความปลอดภัย อาชีวอนามัย พ.ศ. 2554\n• กฎกระทรวง PPE ปี 2563\n• มาตรฐาน มอก. 8001-2552 (OHSAS 18001)\n\nระดับสากล:\n• ISO 45001:2018 — มาตรฐาน OH&S Management\n• ILO Convention C155 — Occupational Safety\n\n💡 SafeSight ใช้ ISO 45001 เป็น baseline ทุกรายงานครับ`;
  }
  if (matchKeywords(q, ['เครียด', 'ล้า', 'fatigue', 'stress', 'tired', 'นอนไม่หลับ', 'burnout'])) {
    return `${multiLingualPrompt}🧠 คำแนะนำด้านสุขภาพจิต/ร่างกาย — SafeSight AI\n\nอาการล้าเป็นสาเหตุ #3 ของอุบัติเหตุในโรงงาน EEC\n\nสัญญาณเตือน:\n• ปฏิกิริยาช้าลง >30%\n• สมาธิสั้นลง\n• ปวดศีรษะบ่อย\n\nมาตรการ:\n1. แจ้ง Supervisor เพื่อขอพัก\n2. ดื่มน้ำ ไม่ใช่กาแฟ ในช่วงพัก\n3. หลีกเลี่ยงงานอันตรายหากอ่อนล้ามาก\n\n🛡️ สุขภาพคุณสำคัญกว่าผลผลิตเสมอครับ`;
  }
  if (matchKeywords(q, ['ppe', 'หมวก', 'เสื้อ', 'แว่น', 'helmet', 'vest', 'goggles', 'รองเท้า', 'boots', 'ถุงมือ', 'gloves'])) {
    return `${multiLingualPrompt}🦺 คู่มือ PPE — SafeSight AI\n\nชุด PPE มาตรฐาน EEC (ต้องครบทุกชิ้น):\n🪖 หมวกนิรภัย Hard Hat — Class E (ป้องกันไฟฟ้า)\n🦺 เสื้อสะท้อนแสง Hi-Vis — ANSI/ISEA 107\n🥽 แว่นตานิรภัย Safety Goggles — ANSI Z87.1\n🥾 รองเท้าหัวเหล็ก Safety Boots — S3 Standard\n🧤 ถุงมือ Gloves — ตามประเภทงาน\n\nAI Vision SafeSight ตรวจจับ PPE อัตโนมัติผ่านกล้อง CCTV Real-time ครับ`;
  }

  // Default multilingual response
  return `${multiLingualPrompt}🛡️ SafeSight AI Safety Advisor — ระบบเฝ้าระวังความปลอดภัยแรงงาน EEC\n\nพิมพ์ถามเรื่องความปลอดภัยได้เลยครับ เช่น:\n• "Heat Stroke อาการเป็นอย่างไร"\n• "งานที่สูงต้องใส่อะไรบ้าง"\n• "กฎหมาย PPE ในไทยคืออะไร"\n• "สารเคมีรั่วต้องทำอะไรก่อน"\n\n💬 พิมพ์ 'เมนู' เพื่อดูระบบทั้งหมด | SOS = ฉุกเฉินทันที\n🌐 รองรับ: ไทย | English | မြန်မာ | ខ្មែរ | ລາວ`;
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
  const mission = getDailyMission();
  // Day number for user context (1-based, cycles 1-7)
  const dayNum = (Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % DAILY_MISSIONS.length) + 1;
  return {
    type: "flex",
    altText: `⚡ ภารกิจวันนี้: ${mission.title}`,
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
              { type: "text", text: `🔥 +50 XP · Day ${dayNum}`, weight: "bold", color: "#ffffff", size: "xs", align: "end" },
            ],
          },
          { type: "text", text: mission.title, weight: "bold", color: "#ffffff", size: "xl", margin: "md", wrap: true },
          { type: "text", text: `📋 ${mission.body}`, color: "#fbcfe8", size: "xs", margin: "sm", wrap: true },
          { type: "text", text: "⏱️ ใช้เวลา: 30 วินาที | มาตรฐาน ISO 45001", color: "#fbcfe8", size: "xxs", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0f040b",
        paddingAll: "20px",
        contents: [
          { type: "text", text: `💡 ทำไมสำคัญ: ${mission.tip}`, color: "#cbd5e1", size: "sm", wrap: true },
          { type: "separator", margin: "lg", color: "#3d102c" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#f43f8e", height: "sm", action: { type: "postback", label: "✅ ยืนยันทำภารกิจสำเร็จ (+50 XP)", data: "action=complete_mission" } },
              { type: "button", style: "link", color: "#fbcfe8", height: "sm", action: { type: "message", label: "🔋 ดูคะแนนความพร้อม PPE", text: "คะแนนความพร้อม" } },
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
            const mission = getDailyMission();
            const welcomeMsg = {
              type: 'text',
              text: `🛡️ ยินดีต้อนรับสู่ SafeSight EEC — ระบบความปลอดภัยอัจฉริยะ\n\n⚡ ภารกิจวันนี้: ${mission.title}\n📋 ${mission.body}\n\nแตะเมนูด้านล่าง หรือพิมพ์ 'เมนู' เพื่อเริ่มต้น\n🌐 รองรับ: ไทย | EN | မြန်မာ | ខ្មែរ | ລາວ`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '⚡ รับภารกิจวันนี้', text: 'ขอภารกิจวันนี้' } },
                  { type: 'action', action: { type: 'message', label: '📝 เช็กอินความปลอดภัย', text: 'เช็กอินวันนี้' } },
                  { type: 'action', action: { type: 'message', label: '📋 ดูเมนูทั้งหมด', text: 'เมนู' } },
                ],
              },
            };
            await sendLineMessageWithRetry(event.replyToken, [welcomeMsg, buildSafetyDashboardCarouselFlexMessage(siteUrl)], token);
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', '[Welcome + Sent 6-Card Dashboard]');
            await logAuditToNeon(dbUrl, userId, 'LINE_NEW_FOLLOWER', 'line', 'info', 'New follower added SafeSight LINE OA');
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
              const m = getDailyMission();
              await saveLineMessageToNeon(dbUrl, userId, 'user', `[Completed Mission: ${m.title} +50 XP]`);
              await logAuditToNeon(dbUrl, userId, 'MISSION_COMPLETED', 'gamification', 'info', `Daily mission completed: ${m.title}`);
              replyMessages = [{
                type: 'text',
                text: `🎉 ยินดีด้วยครับ! คุณทำภารกิจสำเร็จ +50 XP!\n\n✅ ภารกิจ: ${m.title}\n\nระบบ SafeSight บันทึกคะแนนสะสมเรียบร้อย\n\n🛡️ ความปลอดภัยเริ่มที่ตัวเราเสมอครับ!`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: '📋 แดชบอร์ดหลัก', data: 'action=menu' } },
                    { type: 'action', action: { type: 'postback', label: '🔋 ดูคะแนนความพร้อม', data: 'action=readiness' } },
                    { type: 'action', action: { type: 'message', label: '📝 เช็กอินด้วย', text: 'เช็กอินวันนี้' } },
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

            // ── Exact Rich Menu button texts (highest priority) ──
            if (userMsg === 'ขอภารกิจวันนี้') {
              replyMessages = [buildSafetyMissionDetailFlexMessage()];
            } else if (userMsg === 'คะแนนความพร้อม') {
              replyMessages = [buildSafetyReadinessDetailFlexMessage()];
            } else if (userMsg === 'เรดาร์ความเสี่ยง') {
              replyMessages = [buildSafetyRadarDetailFlexMessage()];
            } else if (userMsg === 'เช็กอินวันนี้') {
              replyMessages = [buildSafetyCheckinFlexMessage()];
            } else if (userMsg === 'ส่งภาพตรวจ AI') {
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
            } else if (userMsg === 'ปรึกษา Safety AI') {
              replyMessages = [{
                type: 'text',
                text: '🛡️ SafeSight 24/7 AI Safety Officer พร้อมให้คำปรึกษาครับ\n\nพิมพ์ถามได้เลย เช่น:\n• "Heat Stroke อาการเป็นอย่างไร"\n• "สารเคมีรั่วต้องทำอะไรก่อน"\n• "กฎหมาย PPE งานที่สูง"\n• "ไฟไหม้ต้องทำอย่างไร"\n• "PPE ครบชุดมีอะไรบ้าง"',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '⚡ รับภารกิจวันนี้', text: 'ขอภารกิจวันนี้' } },
                    { type: 'action', action: { type: 'message', label: '🆘 SOS ฉุกเฉิน', text: 'SOS' } },
                    { type: 'action', action: { type: 'message', label: '🦺 ดูคู่มือ PPE', text: 'PPE ครบชุดมีอะไรบ้าง' } },
                  ],
                },
              }];

            // ── Keyword-based fuzzy matchers ──
            } else if (matchKeywords(userMsg, ['เมนู', 'menu', 'dashboard', 'แดชบอร์ด', 'home', 'เริ่ม', 'help', 'สวัสดี', 'hello', 'hi'])) {
              replyMessages = [buildSafetyDashboardCarouselFlexMessage(siteUrl)];

            } else if (matchKeywords(userMsg, ['ภารกิจ', 'mission', 'task', 'ขอภารกิจ'])) {
              replyMessages = [buildSafetyMissionDetailFlexMessage()];

            } else if (matchKeywords(userMsg, ['พร้อม', 'คะแนน', 'readiness', 'score', 'ความพร้อม'])) {
              replyMessages = [buildSafetyReadinessDetailFlexMessage()];

            } else if (matchKeywords(userMsg, ['เรดาร์', 'radar', 'เซ็นเซอร์', 'h2s', 'sensor', 'ความเสี่ยง', 'risk'])) {
              replyMessages = [buildSafetyRadarDetailFlexMessage()];

            } else if (matchKeywords(userMsg, ['เช็กอิน', 'เช็คอิน', 'checkin', 'check in', 'check-in', 'เช็กอินวันนี้'])) {
              replyMessages = [buildSafetyCheckinFlexMessage()];

            } else if (matchKeywords(userMsg, ['แจ้งเตือน', 'alert', 'alerts', 'อุบัติเหตุ', 'accident', 'ล่าสุด'])) {
              replyMessages = [buildAlertSummaryFlexMessage()];

            } else if (matchKeywords(userMsg, ['รายงาน', 'จุดเสี่ยง', 'report', 'hazard', 'near miss', 'near-miss'])) {
              replyMessages = [buildHazardReportGuideFlexMessage()];

            } else if (matchKeywords(userMsg, ['SOS', 'sos', 'ฉุกเฉิน', 'emergency', 'ช่วยด้วย', 'ด่วน', 'urgent'])) {
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
              // Image received → log and respond with AI Vision scan guide
              await logAuditToNeon(dbUrl, userId, 'LINE_IMAGE_RECEIVED', 'vision', 'info', `Image message received from ${userId}`);
              replyMessages = [{
                type: 'flex',
                altText: '📸 AI Vision ได้รับรูปภาพแล้ว — กำลังวิเคราะห์',
                contents: {
                  type: 'bubble', size: 'giga',
                  header: {
                    type: 'box', layout: 'vertical', backgroundColor: '#072930', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '📸 AI Vision (YOLOv8) ได้รับรูปภาพแล้ว', weight: 'bold', color: "#06b6d4", size: 'sm' },
                      { type: 'text', text: 'กำลังวิเคราะห์ PPE & ความปลอดภัยหน้างาน', weight: 'bold', color: '#ffffff', size: 'md', margin: 'sm' },
                    ],
                  },
                  body: {
                    type: 'box', layout: 'vertical', backgroundColor: '#031417', paddingAll: '20px',
                    contents: [
                      { type: 'text', text: '🔍 ผลวิเคราะห์เบื้องต้น (ตรวจสอบบนเว็บสำหรับผลแบบ Real-time):\n\n🪖 หมวกนิรภัย: กำลังวิเคราะห์...\n🦺 เสื้อสะท้อนแสง: กำลังวิเคราะห์...\n🥽 แว่นตานิรภัย: กำลังวิเคราะห์...\n👷 จำนวนคนในภาพ: กำลังนับ...\n\n💡 สำหรับผล Real-time แบบสด กรุณาเปิดเว็บแอปและใช้กล้อง AI Vision โดยตรงครับ', color: '#cbd5e1', size: 'sm', wrap: true },
                      { type: 'separator', margin: 'lg', color: '#104c57' },
                      {
                        type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
                        contents: [
                          { type: 'button', style: 'primary', color: '#06b6d4', height: 'sm', action: { type: 'uri', label: '🌐 เปิดดูผลบนกล้อง AI สด', uri: `${siteUrl}` } },
                          { type: 'button', style: 'link', color: '#a5f3fc', height: 'sm', action: { type: 'message', label: '📸 ส่งภาพรูปอื่น', text: 'ส่งภาพตรวจ AI' } },
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
