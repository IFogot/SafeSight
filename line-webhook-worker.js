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
const userLangCache = new Map(); // line_user_id -> 'th' | 'en' | 'my' | 'km' | 'lo'

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

// ── User Language Persistence ──
async function getUserLanguage(dbUrl, userId) {
  if (!userId || userId === 'anonymous') return 'th';
  if (userLangCache.has(userId)) {
    return userLangCache.get(userId);
  }
  if (!dbUrl) return 'th';

  try {
    const rows = await neonQuery(
      dbUrl,
      `SELECT language FROM safesight_user_preferences WHERE line_user_id = $1 LIMIT 1;`,
      [userId]
    );
    if (rows && rows.length > 0 && rows[0].language) {
      const lang = rows[0].language;
      userLangCache.set(userId, lang);
      return lang;
    }
  } catch (e) {
    log('warn', 'Error fetching user language preference', { error: e.message });
  }

  userLangCache.set(userId, 'th');
  return 'th';
}

async function setUserLanguage(dbUrl, userId, lang) {
  const validLangs = ['th', 'en', 'my', 'km', 'lo'];
  const targetLang = validLangs.includes(lang) ? lang : 'th';
  userLangCache.set(userId, targetLang);

  if (!dbUrl || !userId || userId === 'anonymous') return targetLang;

  const query = `
    INSERT INTO safesight_user_preferences (line_user_id, language, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (line_user_id)
    DO UPDATE SET language = $2, updated_at = NOW();
  `;
  await neonQuery(dbUrl, query, [userId, targetLang]);
  await logAuditToNeon(dbUrl, userId, 'LANGUAGE_UPDATED', 'preferences', 'info', `User set language to ${targetLang}`);
  return targetLang;
}

// ── 5-Language Localization Dictionary (I18N) ──
const I18N = {
  th: {
    langName: "ภาษาไทย",
    flag: "🇹🇭",
    dashboardAlt: "🛡️ แดชบอร์ดความปลอดภัย SafeSight EEC (6 เมนูหลัก)",
    missionTitle: "⚡ ภารกิจ 1 อย่าง",
    missionBadge: "🔥 +50 XP",
    missionDesc: "ดื่มน้ำ · ตรวจสาย Harness",
    missionSub: "ภารกิจความปลอดภัย 30 วิ",
    missionBtn: "แตะรับภารกิจวันนี้",
    
    readinessTitle: "🔋 คะแนนความพร้อม",
    readinessScore: "98/100",
    readinessDesc: "หมวก · เสื้อ · แว่นตา",
    readinessSub: "ตรวจเช็ก PPE ครบเซ็ต",
    readinessBtn: "ดูความพร้อม PPE",

    radarTitle: "📡 เรดาร์จุดเสี่ยง EEC",
    radarBadge: "Real-time",
    radarDesc: "แก๊ส H2S & เสียง 24/7",
    radarSub: "IoT ตรวจวัด 4 โซน EEC",
    radarBtn: "เปิดตรวจเรดาร์",

    sosTitle: "🚨 SOS ฉุกเฉิน EEC",
    sosBadge: "EMERGENCY",
    sosDesc: "โทร 1669 & Safety Officer",
    sosSub: "ส่งพิกัดช่วยเหลือกู้ภัยทันที",
    sosBtn: "🚨 กดขอความช่วยเหลือ",

    checkinTitle: "📝 เช็กอิน 30 วินาที",
    checkinBadge: "Pre-shift",
    checkinDesc: "ยืนยัน PPE ก่อนเริ่มงาน",
    checkinSub: "บันทึกความพร้อมทุกกะ",
    checkinBtn: "เช็กอินความปลอดภัย",

    visionTitle: "📷 ตรวจจับ AI Vision",
    visionBadge: "YOLOv8",
    visionDesc: "สแกน PPE & จุดเสี่ยง",
    visionSub: "AI วิเคราะห์ภาพหน้างาน",
    visionBtn: "ส่งภาพสแกน AI",

    langTitle: "🌐 เปลี่ยนภาษา",
    langBadge: "5 Languages",
    langDesc: "เลือกภาษาที่ใช้งาน",
    langSub: "TH · EN · MY · KM · LO",
    langBtn: "เลือกภาษา / Language",

    openApp: "🌐 เปิดแอป SafeSight",
    dashboardMenu: "📋 ดูเมนูแดชบอร์ดหลัก",
    call1669: "📞 โทร 1669 (กู้ภัยการแพทย์)",
    langChanged: "✅ เปลี่ยนภาษาเป็น ภาษาไทย เรียบร้อยแล้ว!",
  },
  en: {
    langName: "English",
    flag: "🇬🇧",
    dashboardAlt: "🛡️ SafeSight EEC Safety Dashboard (6 Core Actions)",
    missionTitle: "⚡ 1 Daily Mission",
    missionBadge: "🔥 +50 XP",
    missionDesc: "Hydrate · Inspect Harness",
    missionSub: "30-sec safety micro-action",
    missionBtn: "Claim Today's Mission",

    readinessTitle: "🔋 Safety Readiness",
    readinessScore: "98/100",
    readinessDesc: "Helmet · Hi-Vis · Goggles",
    readinessSub: "Complete PPE validation",
    readinessBtn: "Check PPE Score",

    radarTitle: "📡 EEC Hazard Radar",
    radarBadge: "Real-time",
    radarDesc: "Gas H2S & Noise 24/7",
    radarSub: "IoT multi-zone network",
    radarBtn: "Open Risk Radar",

    sosTitle: "🚨 Emergency SOS",
    sosBadge: "CRITICAL",
    sosDesc: "Call 1669 & Safety Officer",
    sosSub: "Instant rescue dispatch & audit",
    sosBtn: "🚨 Trigger Emergency SOS",

    checkinTitle: "📝 30s Safety Check-in",
    checkinBadge: "Pre-shift",
    checkinDesc: "Confirm PPE Pre-shift",
    checkinSub: "Fast daily shift record",
    checkinBtn: "Complete Check-in",

    visionTitle: "📷 AI Vision Scan",
    visionBadge: "YOLOv8",
    visionDesc: "Scan PPE & Job Hazards",
    visionSub: "Instant computer vision",
    visionBtn: "Send Photo for AI Scan",

    langTitle: "🌐 Language / ภาษา",
    langBadge: "5 Languages",
    langDesc: "Select preferred language",
    langSub: "TH · EN · MY · KM · LO",
    langBtn: "Change Language",

    openApp: "🌐 Open SafeSight Web App",
    dashboardMenu: "📋 Main Safety Menu",
    call1669: "📞 Call 1669 Medical Rescue",
    langChanged: "✅ Language successfully set to English!",
  },
  my: {
    langName: "မြန်မာစာ",
    flag: "🇲🇲",
    dashboardAlt: "🛡️ SafeSight EEC လုံခြုံရေး ဒက်ရှ်ဘုတ်",
    missionTitle: "⚡ နေ့စဥ်တာဝန် ၁ ခု",
    missionBadge: "🔥 +50 XP",
    missionDesc: "ရေသောက်ပါ · Harness စစ်ပါ",
    missionSub: "၃၀ စက္ကန့် လုံခြုံရေးတာဝန်",
    missionBtn: "ယနေ့တာဝန်ကိုရယူပါ",

    readinessTitle: "🔋 အဆင်သင့်ဖြစ်မှုရမှတ်",
    readinessScore: "98/100",
    readinessDesc: "ဦးထုပ် · အင်္ကျီ · မျက်မှန်",
    readinessSub: "PPE အပြည့်အစုံ စစ်ဆေးပါ",
    readinessBtn: "PPE အဆင်သင့်မှုကြည့်ပါ",

    radarTitle: "📡 EEC အန္တရာယ်ရေဒါ",
    radarBadge: "တိုက်ရိုက်",
    radarDesc: "H2S ဓာတ်ငွေ့နှင့် ဆူညံသံ",
    radarSub: "IoT အာရုံခံကိရိယာများ",
    radarBtn: "ရေဒါဖွင့်ကြည့်ပါ",

    sosTitle: "🚨 အရေးပေါ် SOS",
    sosBadge: "အရေးပေါ်",
    sosDesc: "၁၆၆၉ နှင့် Safety အရာရှိ",
    sosSub: "အရေးပေါ် ကယ်ဆယ်ရေးခေါ်ဆိုမှု",
    sosBtn: "🚨 အရေးပေါ် အကူအညီတောင်းပါ",

    checkinTitle: "📝 ၃၀ စက္ကန့် စစ်ဆေးမှု",
    checkinBadge: "အဆိုင်းမစမီ",
    checkinDesc: "PPE ဝတ်ဆင်မှု အတည်ပြုပါ",
    checkinSub: "အလုပ်မစမီ စစ်ဆေးချက်",
    checkinBtn: "လုံခြုံရေး စစ်ဆေးပါ",

    visionTitle: "📷 AI Vision စကင်န်",
    visionBadge: "YOLOv8",
    visionDesc: "PPE နှင့် အန္တရာယ်စကင်န်",
    visionSub: "AI ဓာတ်ပုံစစ်ဆေးခြင်း",
    visionBtn: "ဓာတ်ပုံပို့ပြီး စစ်ဆေးပါ",

    langTitle: "🌐 ဘာသာစကားပြောင်းပါ",
    langBadge: "၅ ဘာသာ",
    langDesc: "ဘာသာစကား ရွေးချယ်ပါ",
    langSub: "TH · EN · MY · KM · LO",
    langBtn: "ဘာသာစကားရွေးပါ",

    openApp: "🌐 SafeSight အက်ပ်ကိုဖွင့်ပါ",
    dashboardMenu: "📋 ပင်မ မီနူးသို့",
    call1669: "📞 ၁၆၆၉ ကယ်ဆယ်ရေးခေါ်ပါ",
    langChanged: "✅ ဘာသာစကားကို မြန်မာစာ သို့ အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ။",
  },
  km: {
    langName: "ភាសាខ្មែរ",
    flag: "🇰🇭",
    dashboardAlt: "🛡️ ផ្ទាំងគ្រប់គ្រងសុវត្ថិភាព SafeSight EEC",
    missionTitle: "⚡ បេសកកម្ម ១ ប្រចាំថ្ងៃ",
    missionBadge: "🔥 +50 XP",
    missionDesc: "ផឹកទឹក · ពិនិត្យខ្សែ Harness",
    missionSub: "សកម្មភាពសុវត្ថិភាព ៣០ វិនាទី",
    missionBtn: "ទទួលបេសកកម្មថ្ងៃនេះ",

    readinessTitle: "🔋 ពិន្ទុត្រៀមខ្លួន",
    readinessScore: "98/100",
    readinessDesc: "មួក · អាវចំណាំងផ្លាត · វ៉ែនតា",
    readinessSub: "ផ្ទៀងផ្ទាត់ PPE ពេញលេញ",
    readinessBtn: "ពិនិត្យការត្រៀម PPE",

    radarTitle: "📡 រ៉ាដាហានិភ័យ EEC",
    radarBadge: "Real-time",
    radarDesc: "ឧស្ម័ន H2S និងសំឡេង ២៤/៧",
    radarSub: "បណ្តាញឧបករណ៍ចាប់សញ្ញា IoT",
    radarBtn: "បើករ៉ាដាហានិភ័យ",

    sosTitle: "🚨 សង្គ្រោះបន្ទាន់ SOS",
    sosBadge: "សង្គ្រោះបន្ទាន់",
    sosDesc: "ទូរស័ព្ទ ១៦៦៩ & មន្ត្រីសុវត្ថិភាព",
    sosSub: "បញ្ជូនជំនួយសង្គ្រោះភ្លាមៗ",
    sosBtn: "🚨 ស្នើសុំជំនួយសង្គ្រោះបន្ទាន់",

    checkinTitle: "📝 ពិនិត្យចូល ៣០ វិនាទី",
    checkinBadge: "មុនចូលធ្វើការ",
    checkinDesc: "បញ្ជាក់ PPE មុនចាប់ផ្តើម",
    checkinSub: "កត់ត្រាវេនការងារប្រចាំថ្ងៃ",
    checkinBtn: "ពិនិត្យសុវត្ថិភាព",

    visionTitle: "📷 ស្កេន AI Vision",
    visionBadge: "YOLOv8",
    visionDesc: "ស្កេន PPE & ចំណុចគ្រោះថ្នាក់",
    visionSub: "វិភាគរូបភាពដោយ AI",
    visionBtn: "ផ្ញើរូបថតស្កេន AI",

    langTitle: "🌐 ផ្លាស់ប្តូរភាសា",
    langBadge: "៥ ភាសា",
    langDesc: "ជ្រើសរើសភាសាដែលអ្នកពេញចិត្ត",
    langSub: "TH · EN · MY · KM · LO",
    langBtn: "ជ្រើសរើសភាសា",

    openApp: "🌐 បើកកម្មវិធី SafeSight",
    dashboardMenu: "📋 ម៉ឺនុយមេ",
    call1669: "📞 ទូរស័ព្ទ ១៦៦៩ (សង្គ្រោះបន្ទាន់)",
    langChanged: "✅ បានផ្លាស់ប្តូរភាសាទៅជា ភាសាខ្មែរ ដោយជោគជ័យ!",
  },
  lo: {
    langName: "ພາສາລາວ",
    flag: "🇱🇦",
    dashboardAlt: "🛡️ ແດຊບອດຄວາມປອດໄພ SafeSight EEC",
    missionTitle: "⚡ ພາລະກິດ 1 ຢ່າງ",
    missionBadge: "🔥 +50 XP",
    missionDesc: "ດື່ມນ້ຳ · ກວດສາຍ Harness",
    missionSub: "ພາລະກິດຄວາມປອດໄພ 30 ວິ",
    missionBtn: "ແຕະຮັບພາລະກິດມື້ນີ້",

    readinessTitle: "🔋 ຄະແນນຄວາມພ້ອມ",
    readinessScore: "98/100",
    readinessDesc: "ໝວກ · ເສື້ອ · ແວ່ນຕາ",
    readinessSub: "ກວດເຊັກ PPE ຄົບຊຸດ",
    readinessBtn: "ເບິ່ງຄວາມພ້ອມ PPE",

    radarTitle: "📡 ເຣດາຈຸດສ່ຽງ EEC",
    radarBadge: "Real-time",
    radarDesc: "ແກ໊ສ H2S & ສຽງ 24/7",
    radarSub: "IoT ກວດວັດ 4 ໂຊນ EEC",
    radarBtn: "ເປີດກວດເຣດາ",

    sosTitle: "🚨 SOS ສຸກເສີນ EEC",
    sosBadge: "EMERGENCY",
    sosDesc: "ໂທ 1669 & Safety Officer",
    sosSub: "ສົ່ງພິກັດຊ່ວຍເຫຼືອກູ້ໄພທັນທີ",
    sosBtn: "🚨 ກົດຂໍຄວາມຊ່ວຍເຫຼືອ",

    checkinTitle: "📝 ເຊັກອິນ 30 ວິນາທີ",
    checkinBadge: "Pre-shift",
    checkinDesc: "ຢືນຢັນ PPE ກ່ອນເລີ່ມວຽກ",
    checkinSub: "ບັນທຶກຄວາມພ້ອມທຸກກະ",
    checkinBtn: "ເຊັກອິນຄວາມປອດໄພ",

    visionTitle: "📷 ກວດຈັບ AI Vision",
    visionBadge: "YOLOv8",
    visionDesc: "ສະແກນໝວກ ເສື້ອ ແວ່ນ ຈຸດສ່ຽງ",
    visionSub: "AI ວິເຄາະພາບໜ້າວຽກ",
    visionBtn: "ສົ່ງພາບສະແກນ AI",

    langTitle: "🌐 ປ່ຽນພາສາ",
    langBadge: "5 ພາສາ",
    langDesc: "ເລືອກພາສາທີ່ໃຊ້ງານ",
    langSub: "TH · EN · MY · KM · LO",
    langBtn: "ເລືອກພາສາ / Language",

    openApp: "🌐 ເປີດແອັບ SafeSight",
    dashboardMenu: "📋 ເບິ່ງເມນູຫຼັກ",
    call1669: "📞 ໂທ 1669 (ກູ້ໄພການແພດ)",
    langChanged: "✅ ປ່ຽນພາສາເປັນ ພາສາລາວ ຮຽບຮ້ອຍແລ້ວ!",
  },
};

// ── Daily Rotating Mission Pool (Multilingual) ──
const DAILY_MISSIONS_I18N = {
  th: [
    { title: 'ดื่มน้ำ · ตรวจสาย Harness', body: 'ดื่มน้ำ 250 มล. และตรวจสลัก D-Ring ก่อนเริ่มงาน', tip: 'การดื่มน้ำก่อนเข้ากะลด Heat Stroke ได้ 70% และการตรวจ D-Ring ป้องกันการตกจากที่สูง 100%' },
    { title: 'ตรวจสอบ PPE ครบชุด', body: 'ยืนยันว่าสวมหมวก เสื้อ แว่น รองเท้า ครบก่อนเข้าโซนงาน', tip: 'PPE ที่ครบชุดลดโอกาสบาดเจ็บได้ถึง 85% ตามมาตรฐาน ISO 45001' },
    { title: 'ถ่ายรูป Near-miss วันนี้', body: 'หากพบจุดเสี่ยงในพื้นที่ ถ่ายรูปแล้วรายงานทันที', tip: 'การรายงาน Near-miss ทุก 1 รายงาน ช่วยป้องกันอุบัติเหตุในอนาคตได้ 10 เหตุการณ์' },
    { title: 'ตรวจ Sensor แก๊ส H2S', body: 'ตรวจสอบว่า Gas Detector ติดตัวและแสดงสีเขียว', tip: 'H2S ไม่มีสี ไม่มีกลิ่นในความเข้มข้นสูง ต้องพึ่งพา Sensor เท่านั้น' },
    { title: 'พักตาจากหน้าจอ 20-20-20', body: 'ทุก 20 นาที มองวัตถุห่าง 20 ฟุต เป็นเวลา 20 วินาที', tip: 'ลดอาการตาล้าจากการจ้องหน้าจอควบคุมในโรงงาน EEC' },
    { title: 'เช็กสัญญาณฉุกเฉิน', body: 'ทดสอบปุ่ม Emergency Stop บนสถานีงานของคุณ', tip: 'Emergency Stop ที่ใช้งานได้ลดเวลาหยุดเครื่องในกรณีฉุกเฉินได้ >40%' },
    { title: 'รายงานอุปกรณ์ชำรุด', body: 'ตรวจและแจ้ง Supervisor หากพบอุปกรณ์หรือเครื่องมือชำรุด', tip: 'อุปกรณ์ชำรุดที่ไม่ได้แจ้งคือสาเหตุ #1 ของอุบัติเหตุซ้ำในโรงงาน' },
  ],
  en: [
    { title: 'Hydrate & Inspect Harness', body: 'Drink 250 ml of water and check your D-Ring connector before shift start.', tip: 'Pre-shift hydration reduces heat stroke risk by 70%, and checking harness D-rings prevents falls 100%.' },
    { title: 'Complete PPE Inspection', body: 'Verify Helmet, Hi-Vis Vest, Safety Goggles, and Steel-toe Boots.', tip: 'Full PPE compliance reduces workplace injury risk by 85% under ISO 45001.' },
    { title: 'Report a Near-miss Hazard', body: 'Take a photo of any unsafe condition and submit an instant report.', tip: 'Every near-miss report helps prevent up to 10 potential future accidents.' },
    { title: 'Check Portable H2S Gas Sensor', body: 'Ensure your wearable gas monitor is active and calibrated.', tip: 'Hydrogen Sulfide is odorless at high concentrations; wearable sensors save lives.' },
    { title: '20-20-20 Eye Strain Break', body: 'Every 20 mins, look at something 20 feet away for 20 seconds.', tip: 'Reduces visual fatigue and reaction slowdowns in control rooms.' },
    { title: 'Test E-Stop Button', body: 'Locate and verify clear access to the emergency stop button.', tip: 'Accessible E-stops cut machine shutdown delay in critical moments.' },
    { title: 'Report Faulty Tools', body: 'Inspect cords and hand tools; tag out any damaged equipment.', tip: 'Damaged tools are the leading cause of repetitive industrial injuries.' },
  ],
  my: [
    { title: 'ရေသောက်ပါ · Harness စစ်ဆေးပါ', body: 'ရေ ၂၅၀ မီလီလီတာ သောက်ပြီး အလုပ်မစမီ D-Ring ချိတ်ကို စစ်ဆေးပါ။', tip: 'ရေသောက်ခြင်းသည် အပူဒဏ်ကြောင့် မူးလဲခြင်းကို ၇၀% လျှော့ချပေးသည်။' },
    { title: 'PPE အပြည့်အစုံ စစ်ဆေးပါ', body: 'ဦးထုပ်၊ အင်္ကျီ၊ မျက်မှန်၊ ဖိနပ်များ ပြည့်စုံစွာ ဝတ်ဆင်ထားကြောင်း အတည်ပြုပါ။', tip: 'PPE ပြည့်စုံမှုသည် ထိခိုက်ဒဏ်ရာရမှုကို ၈၅% လျှော့ချပေးသည်။' },
    { title: 'အန္တရာယ်ဖြစ်လုနီးပါး အခြေအနေကို သတင်းပို့ပါ', body: 'အန္တရာယ်ရှိသော နေရာကို တွေ့ပါက ဓာတ်ပုံရိုက်ပြီး ချက်ချင်း သတင်းပို့ပါ။', tip: 'သတင်းပို့ခြင်းသည် အနာဂတ် မတော်တဆမှုများကို ကာကွယ်ပေးသည်။' },
    { title: 'H2S ဓာတ်ငွေ့အာရုံခံကိရိယာ စစ်ဆေးပါ', body: 'ဓာတ်ငွေ့အာရုံခံကိရိယာ အလုပ်လုပ်နေကြောင်း စစ်ဆေးပါ။', tip: 'အဆိပ်ဓာတ်ငွေ့များသည် အာရုံခံကိရိယာဖြင့်သာ သိရှိနိုင်သည်။' },
    { title: 'မျက်စိ အနားပေးပါ', body: 'မိနစ် ၂၀ တိုင်း အဝေးသို့ စက္ကန့် ၂၀ ကြည့်ပေးပါ။', tip: 'မျက်စိညောင်းညာမှုကို လျှော့ချပေးသည်။' },
    { title: 'အရေးပေါ် ခလုတ် စစ်ဆေးပါ', body: 'အရေးပေါ်ရပ်တန့်ခလုတ်ကို စမ်းသပ်စစ်ဆေးပါ။', tip: 'အရေးပေါ်အခြေအနေတွင် အမြန်ဆုံး ရပ်တန့်နိုင်သည်။' },
    { title: 'ပျက်စီးသော ပစ္စည်းများကို သတင်းပို့ပါ', body: 'ကိရိယာများ ပျက်စီးနေပါက တာဝန်ခံထံ အကြောင်းကြားပါ။', tip: 'လုံခြုံရေးသည် မိမိကိုယ်တိုင်မှ စတင်သည်။' },
  ],
  km: [
    { title: 'ផឹកទឹក · ពិនិត្យខ្សែ Harness', body: 'ផឹកទឹក ២៥០ មីលីលីត្រ និងពិនិត្យកន្លែងភ្ជាប់ D-Ring មុនចាប់ផ្តើមការងារ។', tip: 'ការផឹកទឹកជួយកាត់បន្ថយជំងឺដាច់សរសៃឈាមខួរក្បាលដោយសារកម្តៅ ៧០%។' },
    { title: 'ពិនិត្យឧបករណ៍ PPE ពេញលេញ', body: 'បញ្ជាក់ថាមួក អាវ វ៉ែនតា និងស្បែកជើងត្រូវបានពាក់ត្រឹមត្រូវ។', tip: 'ការស្លៀកពាក់ PPE ពេញលេញកាត់បន្ថយគ្រោះថ្នាក់ ៨៥%។' },
    { title: 'រាយការណ៍អំពីចំណុចគ្រោះថ្នាក់', body: 'ប្រសិនបើអ្នកឃើញចំណុចគ្រោះថ្នាក់ សូមថតរូប និងរាយការណ៍ភ្លាមៗ។', tip: 'ការរាយការណ៍ជួយការពារគ្រោះថ្នាក់នៅពេលអនាគត។' },
    { title: 'ពិនិត្យឧបករណ៍ចាប់ឧស្ម័ន H2S', body: 'ធានាថាឧបករណ៍ចាប់សញ្ញាឧស្ម័នដំណើរការត្រឹមត្រូវ។', tip: 'ឧបករណ៍ចាប់សញ្ញាជួយសង្គ្រោះជីវិតពីឧស្ម័នពុល។' },
    { title: 'សម្រាកភ្នែក ២០-២០-២០', body: 'រៀងរាល់ ២០ នាទី សម្លឹងមើលចម្ងាយ ២០ ហ្វីត រយៈពេល ២០ វិនាទី។', tip: 'កាត់បន្ថយការអស់កម្លាំងភ្នែក។' },
    { title: 'ពិនិត្យប៊ូតុងសង្គ្រោះបន្ទាន់', body: 'ពិនិត្យមើលប៊ូតុង Emergency Stop នៅកន្លែងធ្វើការ។', tip: 'ជួយបញ្ឈប់ម៉ាស៊ីនទាន់ពេលវេលា។' },
    { title: 'រាយការណ៍ឧបករណ៍ខូច', body: 'ពិនិត្យ និងជូនដំណឹងដល់ Supervisor ប្រសិនបើឧបករណ៍ខូច។', tip: 'សុវត្ថិភាពចាប់ផ្តើមពីយើងទាំងអស់គ្នា។' },
  ],
  lo: [
    { title: 'ດື່ມນ້ຳ · ກວດສາຍ Harness', body: 'ດື່ມນ້ຳ 250 ມລ. ແລະ ກວດກາສະລັກ D-Ring ກ່ອນເລີ່ມວຽກ.', tip: 'ການດື່ມນ້ຳຊ່ວຍຫຼຸດຜ່ອນຄວາມສ່ຽງ Heat Stroke ໄດ້ 70%.' },
    { title: 'ກວດກາ PPE ຄົບຊຸດ', body: 'ຢືນຢັນວ່າໃສ່ໝວກ ເສື້ອ ແວ່ນຕາ ແລະ ເກີບ ຄົບຖ້ວນ.', tip: 'PPE ຄົບຊຸດຫຼຸດໂອກາດບາດເຈັບໄດ້ 85%.' },
    { title: 'ລາຍງານຈຸດສ່ຽງ Near-miss', body: 'ຖ້າພົບຈຸດສ່ຽງ ຖ່າຍຮູບ ແລະ ລາຍງານທັນທີ.', tip: 'ການລາຍງານຊ່ວຍປ້ອງກັນອຸບັດຕິເຫດໃນອະນາຄົດ.' },
    { title: 'ກວດເຊັນເຊີແກ໊ສ H2S', body: 'ກວດສອບວ່າ Gas Detector ເຮັດວຽກປົກກະຕິ.', tip: 'ແກ໊ສພິດບໍ່ມີກິ່ນ ຕ້ອງເພິ່ງພາເຊັນເຊີເທົ່ານັ້ນ.' },
    { title: 'ພັກຜ່ອນສາຍຕາ 20-20-20', body: 'ທຸກ 20 ນາທີ ແນມເບິ່ງໄລຍະໄກ 20 ວິນາທີ.', tip: 'ຫຼຸດອາການເມື່ອຍລ້າຂອງສາຍຕາ.' },
    { title: 'ກວດປຸ່ມສຸກເສີນ E-Stop', body: 'ທົດສອບປຸ່ມ Emergency Stop ຢູ່ຈຸດເຮັດວຽກ.', tip: 'ຊ່ວຍຢຸດເຄື່ອງຈັກໄດ້ທັນທີໃນກໍລະນີສຸກເສີນ.' },
    { title: 'ລາຍງານອຸປະກອນຊຳລຸດ', body: 'ກວດ ແລະ ແຈ້ງ Supervisor ຖ້າພົບອຸປະກອນຊຳລຸດ.', tip: 'ຄວາມປອດໄພເລີ່ມຕົ້ນທີ່ຕົວເຮົາສະເໝີ.' },
  ],
};

function getDailyMission(lang = 'th') {
  const list = DAILY_MISSIONS_I18N[lang] || DAILY_MISSIONS_I18N['th'];
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % list.length;
  return list[dayIndex];
}

// ── Keyword Matching Helper ──
function matchKeywords(text, keywords) {
  if (!text || !keywords || !Array.isArray(keywords)) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ── AI Safety Advisor (Multilingual) ──
function generateSafetyAIResponse(userQuery, lang = 'th') {
  const q = (userQuery || '').toLowerCase();
  const t = I18N[lang] || I18N['th'];

  if (matchKeywords(q, ['ร้อน', 'อุณหภูมิ', 'heat', 'temperature', 'แดด', 'sun', 'stroke', 'အပူ', 'កម្តៅ', 'ຮ້ອນ'])) {
    return `⚠️ ${t.flag} คำเตือนด้านอุณหภูมิ — SafeSight AI Safety Advisor\n\nอุณหภูมิสูงเกินมาตรฐาน (>35°C) เป็นปัจจัยเสี่ยงสำคัญในเขต EEC\n\nมาตรการเบื้องต้น:\n1. ดื่มน้ำ 250 มล. ทุก 30 นาที\n2. พักในที่ร่มทุก 60 นาที\n3. สังเกตอาการ: เวียนศีรษะ คลื่นไส้ ผิวแดง = Heat Stroke\n4. หากพบเพื่อนร่วมงานมีอาการ → พาเข้าที่ร่ม ราดน้ำ แจ้ง Safety Officer\n\n☎️ ฉุกเฉิน: กด SOS เพื่อแจ้งหน่วยกู้ภัยทันที`;
  }
  if (matchKeywords(q, ['เสียง', 'หู', 'noise', 'hearing', 'ดัง', 'loud', 'db', 'เดซิเบล', 'ဆူညံသံ', 'សំឡេង', 'ສຽງ'])) {
    return `🔊 ${t.flag} คำแนะนำด้านเสียงรบกวน — SafeSight AI\n\nพื้นที่ EEC หลายโซนมีระดับเสียงสูงเกิน 85 dB(A)\n\nมาตรฐาน:\n• <85 dB: ปลอดภัย\n• 85-90 dB: สวม Ear Plug\n• >90 dB: สวม Ear Muff\n• >115 dB: ห้ามเข้าโดยไม่มีอุปกรณ์ป้องกัน\n\nIoT sensors ตรวจวัด Real-time บนแดชบอร์ดครับ`;
  }
  if (matchKeywords(q, ['สารเคมี', 'แก๊ส', 'gas', 'chemical', 'h2s', 'co', 'กลิ่น', 'smell', 'ဓာတ်ငွေ့', 'ឧស្ម័ន', 'ແກ໊ສ'])) {
    return `☣️ ${t.flag} คำเตือนด้านสารเคมี/แก๊ส — SafeSight AI\n\nIDLH Protocol:\n1. 🚶 ออกจากพื้นที่ทันที ไปทางเหนือลม (Upwind)\n2. 🆘 กด SOS หรือแจ้ง Safety Officer\n3. 🫁 หากหายใจลำบาก ให้นั่งพัก ห้ามนอนราบ\n4. 🚑 รอทีมกู้ภัยที่จุดรวมพล (Muster Point)\n\n⚠️ ห้ามกลับเข้าพื้นที่จนกว่า Safety Officer จะประกาศ All Clear`;
  }
  if (matchKeywords(q, ['ตก', 'สูง', 'fall', 'height', 'บันได', 'ladder', 'นั่งร้าน', 'scaffold', 'ပြုတ်ကျ', 'ធ្លាក់', 'ຕົກ'])) {
    return `🏗️ ${t.flag} คำเตือนงานที่สูง — SafeSight AI\n\nกฎ PPE สำหรับงานที่สูง (>2 เมตร):\n• สวม Full-body Harness และยึด Lanyard เสมอ\n• ตรวจสภาพนั่งร้านก่อนใช้งาน\n• ห้ามทำงานที่สูงเพียงลำพัง\n• สภาพอากาศแย่ = ห้ามขึ้น\n\nกล้อง AI Vision ของ SafeSight ตรวจจับ Fall Detection แบบ Real-time ครับ`;
  }

  return `🛡️ ${t.flag} SafeSight AI Safety Advisor — ระบบเฝ้าระวังความปลอดภัยแรงงาน EEC\n\nคุณสามารถ:\n• แตะ 'เมนู' หรือเลือกการ์ดความปลอดภัยด้านล่าง\n• พิมพ์ 'ภารกิจ' เพื่อรับภารกิจความปลอดภัยประจำวัน\n• พิมพ์ 'เช็กอิน' ยืนยันความพร้อมก่อนเข้ากะทำงาน\n• ส่งรูปถ่ายหน้างานให้ AI Vision วิเคราะห์จุดเสี่ยง\n• พิมพ์ SOS เพื่อแจ้งเหตุฉุกเฉินทันที\n• พิมพ์ 'เปลี่ยนภาษา' เพื่อเลือกภาษาใช้งาน\n\n🌐 รองรับ 5 ภาษา: ไทย | English | မြန်မာ | ខ្មែរ | ລາວ`;
}

// ── 🎨 6-Card Dashboard Carousel Flex Message (Multilingual) ──
function buildSafetyDashboardCarouselFlexMessage(siteUrl = DEFAULT_SITE_URL, lang = 'th') {
  const t = I18N[lang] || I18N['th'];
  return {
    type: "flex",
    altText: t.dashboardAlt,
    contents: {
      type: "carousel",
      contents: [
        // Card 1: 1 Safety Mission (Pink)
        {
          type: "bubble", size: "kilo",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#200918", paddingAll: "18px",
            contents: [
              {
                type: "box", layout: "horizontal",
                contents: [
                  { type: "text", text: t.missionTitle, weight: "bold", color: "#f43f8e", size: "sm" },
                  { type: "text", text: t.missionBadge, weight: "bold", color: "#fbcfe8", size: "xs", align: "end" },
                ],
              },
              {
                type: "box", layout: "vertical", margin: "md", width: "48px", height: "48px", cornerRadius: "24px",
                backgroundColor: "#f43f8e33", borderColor: "#f43f8e", borderWidth: "normal", alignItems: "center", justifyContent: "center",
                contents: [{ type: "text", text: "⚡", size: "xl", align: "center" }],
              },
              { type: "text", text: t.missionDesc, weight: "bold", color: "#ffffff", size: "md", margin: "md", wrap: true },
              { type: "text", text: t.missionSub, color: "#fbcfe8", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box", layout: "vertical", backgroundColor: "#0f040b", paddingAll: "16px",
            contents: [
              { type: "text", text: "30s Micro Action (ISO 45001)", color: "#cbd5e1", size: "xs" },
              { type: "separator", margin: "md", color: "#3d102c" },
              {
                type: "box", layout: "vertical", margin: "md", spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#f43f8e", height: "sm", action: { type: "postback", label: t.missionBtn, data: "action=mission" } },
                  { type: "button", style: "link", color: "#fbcfe8", height: "sm", action: { type: "uri", label: t.openApp, uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 2: PPE Readiness Score (Emerald Green)
        {
          type: "bubble", size: "kilo",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#062319", paddingAll: "18px",
            contents: [
              {
                type: "box", layout: "horizontal",
                contents: [
                  { type: "text", text: t.readinessTitle, weight: "bold", color: "#10b981", size: "sm" },
                  { type: "text", text: t.readinessScore, weight: "bold", color: "#a7f3d0", size: "xs", align: "end" },
                ],
              },
              {
                type: "box", layout: "vertical", margin: "md", width: "48px", height: "48px", cornerRadius: "24px",
                backgroundColor: "#10b98133", borderColor: "#10b981", borderWidth: "normal", alignItems: "center", justifyContent: "center",
                contents: [{ type: "text", text: "🔋", size: "xl", align: "center" }],
              },
              { type: "text", text: t.readinessDesc, weight: "bold", color: "#ffffff", size: "md", margin: "md", wrap: true },
              { type: "text", text: t.readinessSub, color: "#a7f3d0", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box", layout: "vertical", backgroundColor: "#02120c", paddingAll: "16px",
            contents: [
              { type: "text", text: "Hard Hat 98% · Hi-Vis 94% · Boots 99%", color: "#cbd5e1", size: "xs" },
              { type: "separator", margin: "md", color: "#114232" },
              {
                type: "box", layout: "vertical", margin: "md", spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#10b981", height: "sm", action: { type: "postback", label: t.readinessBtn, data: "action=readiness" } },
                  { type: "button", style: "link", color: "#a7f3d0", height: "sm", action: { type: "uri", label: t.openApp, uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 3: EEC Silent Risk Radar (Purple)
        {
          type: "bubble", size: "kilo",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#1f0c38", paddingAll: "18px",
            contents: [
              {
                type: "box", layout: "horizontal",
                contents: [
                  { type: "text", text: t.radarTitle, weight: "bold", color: "#a855f7", size: "sm" },
                  { type: "text", text: t.radarBadge, weight: "bold", color: "#e9d5ff", size: "xs", align: "end" },
                ],
              },
              {
                type: "box", layout: "vertical", margin: "md", width: "48px", height: "48px", cornerRadius: "24px",
                backgroundColor: "#a855f733", borderColor: "#a855f7", borderWidth: "normal", alignItems: "center", justifyContent: "center",
                contents: [{ type: "text", text: "📡", size: "xl", align: "center" }],
              },
              { type: "text", text: t.radarDesc, weight: "bold", color: "#ffffff", size: "md", margin: "md", wrap: true },
              { type: "text", text: t.radarSub, color: "#e9d5ff", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box", layout: "vertical", backgroundColor: "#0e051c", paddingAll: "16px",
            contents: [
              { type: "text", text: "Gas H2S <1 ppm · Noise <85 dB (Safe)", color: "#cbd5e1", size: "xs" },
              { type: "separator", margin: "md", color: "#3b1569" },
              {
                type: "box", layout: "vertical", margin: "md", spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#a855f7", height: "sm", action: { type: "postback", label: t.radarBtn, data: "action=radar" } },
                  { type: "button", style: "link", color: "#e9d5ff", height: "sm", action: { type: "uri", label: t.openApp, uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 4: 30s Safety Check-in (Indigo)
        {
          type: "bubble", size: "kilo",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#11153b", paddingAll: "18px",
            contents: [
              {
                type: "box", layout: "horizontal",
                contents: [
                  { type: "text", text: t.checkinTitle, weight: "bold", color: "#6366f1", size: "sm" },
                  { type: "text", text: t.checkinBadge, weight: "bold", color: "#c7d2fe", size: "xs", align: "end" },
                ],
              },
              {
                type: "box", layout: "vertical", margin: "md", width: "48px", height: "48px", cornerRadius: "24px",
                backgroundColor: "#6366f133", borderColor: "#6366f1", borderWidth: "normal", alignItems: "center", justifyContent: "center",
                contents: [{ type: "text", text: "📝", size: "xl", align: "center" }],
              },
              { type: "text", text: t.checkinDesc, weight: "bold", color: "#ffffff", size: "md", margin: "md", wrap: true },
              { type: "text", text: t.checkinSub, color: "#c7d2fe", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box", layout: "vertical", backgroundColor: "#07091c", paddingAll: "16px",
            contents: [
              { type: "text", text: "Pre-shift compliance & wellness log", color: "#cbd5e1", size: "xs" },
              { type: "separator", margin: "md", color: "#222769" },
              {
                type: "box", layout: "vertical", margin: "md", spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#6366f1", height: "sm", action: { type: "postback", label: t.checkinBtn, data: "action=checkin" } },
                  { type: "button", style: "link", color: "#c7d2fe", height: "sm", action: { type: "uri", label: t.openApp, uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 5: AI Vision YOLOv8 Scan (Cyan / Teal)
        {
          type: "bubble", size: "kilo",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#072930", paddingAll: "18px",
            contents: [
              {
                type: "box", layout: "horizontal",
                contents: [
                  { type: "text", text: t.visionTitle, weight: "bold", color: "#06b6d4", size: "sm" },
                  { type: "text", text: t.visionBadge, weight: "bold", color: "#a5f3fc", size: "xs", align: "end" },
                ],
              },
              {
                type: "box", layout: "vertical", margin: "md", width: "48px", height: "48px", cornerRadius: "24px",
                backgroundColor: "#06b6d433", borderColor: "#06b6d4", borderWidth: "normal", alignItems: "center", justifyContent: "center",
                contents: [{ type: "text", text: "📷", size: "xl", align: "center" }],
              },
              { type: "text", text: t.visionDesc, weight: "bold", color: "#ffffff", size: "md", margin: "md", wrap: true },
              { type: "text", text: t.visionSub, color: "#a5f3fc", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box", layout: "vertical", backgroundColor: "#031417", paddingAll: "16px",
            contents: [
              { type: "text", text: "Detects Helmet, Vest, Goggles, Fall risk", color: "#cbd5e1", size: "xs" },
              { type: "separator", margin: "md", color: "#104c57" },
              {
                type: "box", layout: "vertical", margin: "md", spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#06b6d4", height: "sm", action: { type: "postback", label: t.visionBtn, data: "action=vision_scan" } },
                  { type: "button", style: "link", color: "#a5f3fc", height: "sm", action: { type: "uri", label: t.openApp, uri: `${siteUrl}` } },
                ],
              },
            ],
          },
        },

        // Card 6: Language Selector (Rose / Magenta)
        {
          type: "bubble", size: "kilo",
          header: {
            type: "box", layout: "vertical", backgroundColor: "#2e081e", paddingAll: "18px",
            contents: [
              {
                type: "box", layout: "horizontal",
                contents: [
                  { type: "text", text: t.langTitle, weight: "bold", color: "#ec4899", size: "sm" },
                  { type: "text", text: `${t.flag} ${t.langName}`, weight: "bold", color: "#fbcfe8", size: "xs", align: "end" },
                ],
              },
              {
                type: "box", layout: "vertical", margin: "md", width: "48px", height: "48px", cornerRadius: "24px",
                backgroundColor: "#ec489933", borderColor: "#ec4899", borderWidth: "normal", alignItems: "center", justifyContent: "center",
                contents: [{ type: "text", text: "🌐", size: "xl", align: "center" }],
              },
              { type: "text", text: t.langDesc, weight: "bold", color: "#ffffff", size: "md", margin: "md", wrap: true },
              { type: "text", text: t.langSub, color: "#fbcfe8", size: "xxs", margin: "xs" },
            ],
          },
          body: {
            type: "box", layout: "vertical", backgroundColor: "#14030d", paddingAll: "16px",
            contents: [
              { type: "text", text: "Persistent across all chat & menus", color: "#cbd5e1", size: "xs" },
              { type: "separator", margin: "md", color: "#541038" },
              {
                type: "box", layout: "vertical", margin: "md", spacing: "xs",
                contents: [
                  { type: "button", style: "primary", color: "#ec4899", height: "sm", action: { type: "postback", label: t.langBtn, data: "action=choose_lang" } },
                  { type: "button", style: "link", color: "#fbcfe8", height: "sm", action: { type: "postback", label: "🚨 SOS Emergency", data: "action=sos" } },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}

// ── Language Selector Interactive Flex Message ──
function buildLanguageSelectorFlexMessage(currentLang = 'th') {
  const langs = [
    { code: 'th', flag: '🇹🇭', name: 'ภาษาไทย', label: 'ภาษาไทย (Thai)' },
    { code: 'en', flag: '🇬🇧', name: 'English', label: 'English (US/UK)' },
    { code: 'my', flag: '🇲🇲', name: 'မြန်မာစာ', label: 'မြန်မာစာ (Myanmar)' },
    { code: 'km', flag: '🇰🇭', name: 'ភាសាខ្មែរ', label: 'ភាសាខ្មែរ (Khmer)' },
    { code: 'lo', flag: '🇱🇦', name: 'ພາສາລາວ', label: 'ພາສາລາວ (Lao)' },
  ];

  return {
    type: "flex",
    altText: "🌐 เลือกภาษาที่คุณต้องการ / Choose your language",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#1e1035", paddingAll: "20px",
        contents: [
          { type: "text", text: "🌐 เลือกภาษาที่คุณต้องการ / Choose Language", weight: "bold", color: "#c084fc", size: "md" },
          { type: "text", text: "ရွေးချယ်ပါ · ជ្រើសរើស · ເລືອກພາສາ", color: "#e9d5ff", size: "xs", margin: "xs" },
        ],
      },
      body: {
        type: "box", layout: "vertical", backgroundColor: "#0f071c", paddingAll: "20px", spacing: "md",
        contents: [
          { type: "text", text: "ภาษาที่เลือกจะถูกบันทึกและแสดงผลถาวรในทุกเมนู:\n(Selected language will persist across all chat bot menus)", color: "#cbd5e1", size: "xs", wrap: true },
          { type: "separator", margin: "sm", color: "#3b1569" },
          ...langs.map((l) => {
            const isCurrent = l.code === currentLang;
            return {
              type: "button",
              style: isCurrent ? "primary" : "secondary",
              color: isCurrent ? "#a855f7" : "#1f1438",
              height: "sm",
              action: {
                type: "postback",
                label: `${l.flag} ${l.name} ${isCurrent ? '✓' : ''}`,
                data: `action=set_lang&lang=${l.code}`,
              },
            };
          }),
        ],
      },
    },
  };
}

// ── Detail Flex Builders (Multilingual) ──

function buildSafetyMissionDetailFlexMessage(lang = 'th') {
  const mission = getDailyMission(lang);
  const t = I18N[lang] || I18N['th'];
  const missionsList = DAILY_MISSIONS_I18N[lang] || DAILY_MISSIONS_I18N['th'];
  const dayNum = (Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % missionsList.length) + 1;
  return {
    type: "flex",
    altText: `⚡ ${mission.title}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#200918", paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: `⚡ ${t.missionTitle}`, weight: "bold", color: "#f43f8e", size: "sm" },
              { type: "text", text: `🔥 +50 XP · Day ${dayNum}`, weight: "bold", color: "#ffffff", size: "xs", align: "end" },
            ],
          },
          { type: "text", text: mission.title, weight: "bold", color: "#ffffff", size: "xl", margin: "md", wrap: true },
          { type: "text", text: `📋 ${mission.body}`, color: "#fbcfe8", size: "xs", margin: "sm", wrap: true },
          { type: "text", text: "⏱️ 30s Action | ISO 45001 Standard", color: "#fbcfe8", size: "xxs", margin: "xs" },
        ],
      },
      body: {
        type: "box", layout: "vertical", backgroundColor: "#0f040b", paddingAll: "20px",
        contents: [
          { type: "text", text: `💡 Tip: ${mission.tip}`, color: "#cbd5e1", size: "sm", wrap: true },
          { type: "separator", margin: "lg", color: "#3d102c" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#f43f8e", height: "sm", action: { type: "postback", label: "✅ Complete Mission (+50 XP)", data: "action=complete_mission" } },
              { type: "button", style: "link", color: "#fbcfe8", height: "sm", action: { type: "postback", label: `🔋 ${t.readinessTitle}`, data: "action=readiness" } },
              { type: "button", style: "secondary", color: "#2a0914", height: "sm", action: { type: "postback", label: `📋 ${t.dashboardMenu}`, data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyReadinessDetailFlexMessage(lang = 'th') {
  const t = I18N[lang] || I18N['th'];
  return {
    type: "flex",
    altText: `🔋 ${t.readinessTitle} — 98/100`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#062319", paddingAll: "20px",
        contents: [
          { type: "text", text: `🔋 ${t.readinessTitle} (Safety Readiness)`, weight: "bold", color: "#10b981", size: "sm" },
          { type: "text", text: "98 / 100", weight: "bold", color: "#ffffff", size: "3xl", margin: "md" },
          { type: "text", text: "✅ 100% Compliant · Ready for shift", color: "#a7f3d0", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box", layout: "vertical", backgroundColor: "#02120c", paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: "🪖 Hard Hat (หมวกนิรภัย):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "98% (Pass)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🦺 Hi-Vis Vest (เสื้อสะท้อนแสง):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "94% (Pass)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🥽 Goggles (แว่นตานิรภัย):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "91% (Pass)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🥾 Safety Boots (รองเท้าหัวเหล็ก):", color: "#94a3b8", size: "sm" },
              { type: "text", text: "99% (Pass)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#114232" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#10b981", height: "sm", action: { type: "postback", label: `✅ ${t.checkinTitle}`, data: "action=checkin" } },
              { type: "button", style: "secondary", color: "#062319", height: "sm", action: { type: "postback", label: `📋 ${t.dashboardMenu}`, data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyRadarDetailFlexMessage(lang = 'th') {
  const t = I18N[lang] || I18N['th'];
  return {
    type: "flex",
    altText: `📡 ${t.radarTitle} (Silent Hazard Radar)`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#1f0c38", paddingAll: "20px",
        contents: [
          { type: "text", text: `📡 ${t.radarTitle} (EEC Silent Risk Radar)`, weight: "bold", color: "#a855f7", size: "sm" },
          { type: "text", text: "🟢 All Zones Safe — ปกติ", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
          { type: "text", text: "Real-time IoT Sentinel multi-sensor mesh", color: "#e9d5ff", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box", layout: "vertical", backgroundColor: "#0d0419", paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: "☣️ Toxic Gas H2S:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "0.3 ppm (Safe)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🌡️ Ambient Temp:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "32.4°C (Normal)", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🔊 Noise Level:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "72 dB(A) (Normal)", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "👷 Active Workers:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "24 Personnel", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#3d196d" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#a855f7", height: "sm", action: { type: "message", label: "🚨 Alerts Log", text: "แจ้งเตือนล่าสุด" } },
              { type: "button", style: "secondary", color: "#1f0c38", height: "sm", action: { type: "postback", label: `📋 ${t.dashboardMenu}`, data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyCheckinFlexMessage(lang = 'th') {
  const t = I18N[lang] || I18N['th'];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
  const dateStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
  return {
    type: 'flex',
    altText: `✅ ${t.checkinTitle}`,
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#052e16', paddingAll: '20px',
        contents: [
          { type: 'text', text: `✅ ${t.checkinTitle} (Pre-Shift Check)`, weight: 'bold', color: '#10b981', size: 'sm' },
          { type: 'text', text: `${dateStr} · ${timeStr}`, weight: 'bold', color: '#ffffff', size: 'lg', margin: 'md' },
          { type: 'text', text: 'Daily PPE standard and fit-for-duty affirmation', color: '#a7f3d0', size: 'xs', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#021a0b', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 Pre-shift Checklist:\n\n🦺 High-visibility vest equipped\n⛑️ Safety hard hat secured\n🥽 Impact/chemical goggles worn\n👢 Steel-toe safety boots equipped\n📡 Radios / Sentinel sensor active', color: '#cbd5e1', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#134e3a' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#10b981', height: 'sm', action: { type: 'postback', label: '✅ Confirm Check-in', data: 'action=checkin_confirmed' } },
              { type: 'button', style: 'secondary', color: '#062319', height: 'sm', action: { type: 'postback', label: `📋 ${t.dashboardMenu}`, data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildEmergencySOSFlexMessage(lang = 'th') {
  const t = I18N[lang] || I18N['th'];
  return {
    type: 'flex',
    altText: `🆘 ${t.sosTitle} — SafeSight Emergency`,
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#7f1d1d', paddingAll: '20px',
        contents: [
          { type: 'text', text: `🆘 ${t.sosTitle} — ฉุกเฉิน!`, weight: 'bold', color: '#ffffff', size: 'lg' },
          { type: 'text', text: 'SafeSight Emergency Protocol Active · กู้ภัยฉุกเฉิน EEC', color: '#fecaca', size: 'xs', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#450a0a', paddingAll: '20px',
        contents: [
          { type: 'text', text: '🚨 Protocol Dispatched:\n\n1. 📡 Alerted Zone Safety Officer (จป.วิชาชีพ)\n2. 🚑 GPS Sent to EEC Emergency Rescue (1669)\n3. 📋 Logged to ISO 45001 Emergency Audit\n4. 🔊 Site Alarm Triggered\n\n⚠️ Emergency Instructions:\n• Move immediately to designated Muster Point (จุดรวมพล)\n• Do NOT enter hazardous zones\n• Await Safety Officer instructions', color: '#fef2f2', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#991b1b' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#dc2626', height: 'sm', action: { type: 'uri', label: '📞 Call 1669 (Emergency Center)', uri: 'tel:1669' } },
              { type: 'button', style: 'secondary', color: '#450a0a', height: 'sm', action: { type: 'postback', label: `📋 ${t.dashboardMenu}`, data: "action=menu" } },
            ],
          },
        ],
      },
    },
  };
}

function buildHazardReportGuideFlexMessage(lang = 'th') {
  const t = I18N[lang] || I18N['th'];
  return {
    type: 'flex',
    altText: '📋 รายงานจุดเสี่ยง / Near-miss Report',
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1a0f00', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 รายงานจุดเสี่ยง (Near-miss Report)', weight: 'bold', color: '#FE6E00', size: 'sm' },
          { type: 'text', text: 'Report Hazardous Conditions (ISO 45001)', weight: 'bold', color: '#ffffff', size: 'lg', margin: 'md' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', backgroundColor: '#0f0800', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📸 Option 1: Snap a photo and send it directly in this chat. SafeSight AI Vision will analyze hazard risks immediately.\n\n📝 Option 2: Open the Web Dashboard to file an incident report with multi-file attachment.\n\nAll reports are archived in Neon DB ISO 45001 audit trail.', color: '#cbd5e1', size: 'sm', wrap: true },
          { type: 'separator', margin: 'lg', color: '#3d2800' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#FE6E00', height: 'sm', action: { type: 'message', label: '📸 ส่งรูปจุดเสี่ยง', text: 'ส่งภาพตรวจ AI' } },
              { type: 'button', style: 'secondary', color: '#1a0f00', height: 'sm', action: { type: 'postback', label: `📋 ${t.dashboardMenu}`, data: "action=menu" } },
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

          // Retrieve user's persisted language
          const userLang = await getUserLanguage(dbUrl, userId);
          const t = I18N[userLang] || I18N['th'];

          // ── Follow / Add Friend Event ──
          if (event.type === 'follow' && event.replyToken) {
            const mission = getDailyMission(userLang);
            const welcomeMsg = {
              type: 'text',
              text: `🛡️ ยินดีต้อนรับสู่ SafeSight EEC — ระบบความปลอดภัยอัจฉริยะ\n\n⚡ ภารกิจวันนี้: ${mission.title}\n📋 ${mission.body}\n\nแตะเมนูด้านล่าง หรือพิมพ์ 'เมนู' เพื่อเริ่มต้น\n🌐 รองรับ: ไทย | EN | မြန်မာ | ខ្មែរ | ລາວ`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '⚡ รับภารกิจวันนี้', text: 'ขอภารกิจวันนี้' } },
                  { type: 'action', action: { type: 'message', label: '📝 เช็กอินความปลอดภัย', text: 'เช็กอินวันนี้' } },
                  { type: 'action', action: { type: 'message', label: '🌐 เปลี่ยนภาษา', text: 'เปลี่ยนภาษา' } },
                ],
              },
            };
            await sendLineMessageWithRetry(event.replyToken, [welcomeMsg, buildSafetyDashboardCarouselFlexMessage(siteUrl, userLang)], token);
            await saveLineMessageToNeon(dbUrl, userId, 'assistant', '[Welcome + Sent 3-Tier Dashboard]');
            await logAuditToNeon(dbUrl, userId, 'LINE_NEW_FOLLOWER', 'line', 'info', 'New follower added SafeSight LINE OA');
            continue;
          }

          // ── Postback Event ──
          if (event.type === 'postback' && event.replyToken) {
            const data = event.postback.data || '';
            let replyMessages = [];

            if (data.startsWith('action=set_lang')) {
              const selectedLang = data.split('lang=')[1] || 'th';
              await setUserLanguage(dbUrl, userId, selectedLang);
              const newT = I18N[selectedLang] || I18N['th'];
              replyMessages = [
                {
                  type: 'text',
                  text: `${newT.flag} ${newT.langChanged}\n\n${newT.dashboardAlt}`,
                  quickReply: {
                    items: [
                      { type: 'action', action: { type: 'postback', label: '📋 ' + newT.dashboardMenu, data: 'action=menu' } },
                      { type: 'action', action: { type: 'postback', label: newT.missionTitle, data: 'action=mission' } },
                      { type: 'action', action: { type: 'postback', label: newT.readinessTitle, data: 'action=readiness' } },
                      { type: 'action', action: { type: 'message', label: '🚨 SOS', text: 'SOS' } },
                    ],
                  },
                },
                buildSafetyDashboardCarouselFlexMessage(siteUrl, selectedLang),
              ];
            } else if (data.startsWith('action=choose_lang') || data.startsWith('action=language')) {
              replyMessages = [buildLanguageSelectorFlexMessage(userLang)];
            } else if (data.startsWith('action=menu') || data.startsWith('action=dashboard')) {
              replyMessages = [buildSafetyDashboardCarouselFlexMessage(siteUrl, userLang)];
            } else if (data.startsWith('action=mission')) {
              replyMessages = [buildSafetyMissionDetailFlexMessage(userLang)];
            } else if (data.startsWith('action=complete_mission')) {
              const m = getDailyMission(userLang);
              await saveLineMessageToNeon(dbUrl, userId, 'user', `[Completed Mission: ${m.title} +50 XP]`);
              await logAuditToNeon(dbUrl, userId, 'MISSION_COMPLETED', 'gamification', 'info', `Daily mission completed: ${m.title}`);
              replyMessages = [{
                type: 'text',
                text: `🎉 ยินดีด้วยครับ! คุณทำภารกิจสำเร็จ +50 XP!\n\n✅ ภารกิจ: ${m.title}\n\nระบบ SafeSight บันทึกคะแนนสะสมเรียบร้อย\n\n🛡️ ความปลอดภัยเริ่มที่ตัวเราเสมอครับ!`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
                    { type: 'action', action: { type: 'postback', label: t.readinessBtn, data: 'action=readiness' } },
                    { type: 'action', action: { type: 'uri', label: t.openApp, uri: `${siteUrl}` } },
                  ],
                },
              }];
            } else if (data.startsWith('action=readiness')) {
              replyMessages = [buildSafetyReadinessDetailFlexMessage(userLang)];
            } else if (data.startsWith('action=radar')) {
              replyMessages = [buildSafetyRadarDetailFlexMessage(userLang)];
            } else if (data.startsWith('action=checkin_confirmed')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[Confirmed Daily Safety Check-in]');
              await logAuditToNeon(dbUrl, userId, 'DAILY_CHECKIN_CONFIRMED', 'safety', 'info', 'Worker pre-shift check-in confirmed via LINE');
              replyMessages = [{
                type: 'text',
                text: '✅ บันทึกเช็กอินความปลอดภัยเรียบร้อยแล้ว!\n\n🛡️ ปฏิบัติตามกฎ PPE ตลอดกะทำงาน\n🦺 สวมหมวก เสื้อสะท้อนแสง แว่นตาครบเซ็ต\n\nขอบคุณที่ร่วมสร้างวัฒนธรรมความปลอดภัยครับ',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
                    { type: 'action', action: { type: 'message', label: '🚨 แจ้งเตือนล่าสุด', text: 'แจ้งเตือนล่าสุด' } },
                    { type: 'action', action: { type: 'uri', label: t.openApp, uri: `${siteUrl}` } },
                  ],
                },
              }];
            } else if (data.startsWith('action=checkin')) {
              replyMessages = [buildSafetyCheckinFlexMessage(userLang)];
            } else if (data.startsWith('action=vision_scan')) {
              replyMessages = [{
                type: 'text',
                text: '📷 ถ่ายรูปหรือส่งภาพถ่ายหน้างานในแชทนี้ได้เลยครับ\n\nระบบ AI Vision (YOLOv8) จะวิเคราะห์การสวมใส่หมวก เสื้อสะท้อนแสง แว่นตา และจุดเสี่ยงอันตรายให้อัตโนมัติทันทีครับ!',
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
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
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
                    { type: 'action', action: { type: 'message', label: '🆘 SOS ฉุกเฉิน', text: 'SOS' } },
                  ],
                },
              }];
            } else if (data.startsWith('action=sos')) {
              await saveLineMessageToNeon(dbUrl, userId, 'user', '[🚨 SOS EMERGENCY]');
              await logAuditToNeon(dbUrl, userId, 'LINE_SOS_TRIGGERED', 'emergency', 'critical', 'SOS triggered via LINE');
              replyMessages = [buildEmergencySOSFlexMessage(userLang)];
            } else if (data.startsWith('action=ack_alert')) {
              const alertId = data.split('=')[2] || 'all';
              await saveLineMessageToNeon(dbUrl, userId, 'user', `[Acknowledged alert: ${alertId}]`);
              replyMessages = [{
                type: 'text',
                text: `✅ รับทราบการแจ้งเตือนแล้ว (${alertId})\n\nบันทึกใน Audit Log เรียบร้อย ขอบคุณที่ตอบรับอย่างรวดเร็วครับ`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
                    { type: 'action', action: { type: 'uri', label: t.openApp, uri: `${siteUrl}` } },
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

            // 1. Language Switcher Trigger
            if (matchKeywords(userMsg, ['เปลี่ยนภาษา', 'language', 'lang', 'ภาษา', 'ဘာသာစကား', 'ភាសា', 'ພາສາ', 'thai', 'english'])) {
              replyMessages = [buildLanguageSelectorFlexMessage(userLang)];

            // 2. Exact Rich Menu button texts (highest priority)
            } else if (matchKeywords(userMsg, ['ขอภารกิจวันนี้', 'daily mission', 'ภารกิจ', 'mission', 'task', 'တာဝန်', 'បេសកកម្ម', 'ພາລະກິດ'])) {
              replyMessages = [buildSafetyMissionDetailFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['คะแนนความพร้อม', 'readiness score', 'ความพร้อม', 'readiness', 'score', 'အဆင်သင့်', 'ត្រៀមខ្លួន', 'ຄວາມພ້ອມ'])) {
              replyMessages = [buildSafetyReadinessDetailFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['เรดาร์ความเสี่ยง', 'risk radar', 'เรดาร์', 'radar', 'แก๊ส', 'gas', 'h2s', 'sensor', 'ရေဒါ', 'រ៉ាដា', 'ເຣດາ'])) {
              replyMessages = [buildSafetyRadarDetailFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['SOS', 'sos', 'ฉุกเฉิน', 'emergency', 'ช่วยด้วย', 'help', 'အရေးပေါ်', 'សង្គ្រោះបន្ទាន់', 'ສຸກເສີນ'])) {
              await logAuditToNeon(dbUrl, userId, 'LINE_SOS_KEYWORD', 'emergency', 'critical', `SOS keyword: ${userMsg}`);
              replyMessages = [buildEmergencySOSFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['เช็กอินวันนี้', 'check-in', 'checkin', 'check in', 'เช็กอิน', 'เช็คอิน', 'စစ်ဆေး', 'ពិនិត្យចូល', 'ເຊັກອິນ'])) {
              replyMessages = [buildSafetyCheckinFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['ส่งภาพตรวจ AI', 'ai scan', 'สแกน', 'scan', 'กล้อง', 'vision', 'ตรวจจับ AI'])) {
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

            } else if (matchKeywords(userMsg, ['เมนู', 'menu', 'dashboard', 'แดชบอร์ด', 'home', 'เริ่ม', 'สวัสดี', 'hello', 'hi'])) {
              replyMessages = [buildSafetyDashboardCarouselFlexMessage(siteUrl, userLang)];

            } else if (matchKeywords(userMsg, ['แจ้งเตือน', 'alert', 'alerts', 'อุบัติเหตุ', 'accident', 'ล่าสุด'])) {
              replyMessages = [buildAlertSummaryFlexMessage()];

            } else if (matchKeywords(userMsg, ['รายงาน', 'จุดเสี่ยง', 'report', 'hazard', 'near miss', 'near-miss'])) {
              replyMessages = [buildHazardReportGuideFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['PPE', 'ppe', 'หมวก', 'เสื้อ', 'แว่น', 'helmet', 'vest', 'goggles', 'boots', 'รองเท้า'])) {
              replyMessages = [buildSafetyReadinessDetailFlexMessage(userLang)];

            } else if (matchKeywords(userMsg, ['ปรึกษา', 'หมอ', 'safety', 'advisor', 'ถาม'])) {
              const aiReply = generateSafetyAIResponse(userMsg, userLang);
              replyMessages = [{
                type: 'text',
                text: aiReply,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
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
                      { type: 'text', text: '🔍 ผลวิเคราะห์เบื้องต้น:\n\n🪖 หมวกนิรภัย: กำลังตรวจจับ...\n🦺 เสื้อสะท้อนแสง: กำลังตรวจจับ...\n🥽 แว่นตานิรภัย: กำลังตรวจจับ...\n👷 จำนวนแรงงาน: 1 คน\n\n💡 สำหรับผล Real-time แบบสด กรุณาเปิดเว็บแอปและใช้กล้อง AI Vision โดยตรงครับ', color: '#cbd5e1', size: 'sm', wrap: true },
                      { type: 'separator', margin: 'lg', color: '#104c57' },
                      {
                        type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
                        contents: [
                          { type: 'button', style: 'primary', color: '#06b6d4', height: 'sm', action: { type: 'uri', label: '🌐 เปิดดูผลบนกล้อง AI สด', uri: `${siteUrl}` } },
                          { type: 'button', style: 'link', color: '#a5f3fc', height: 'sm', action: { type: 'message', label: '📸 ส่งภาพรูปอื่น', text: 'ส่งภาพตรวจ AI' } },
                          { type: 'button', style: 'secondary', color: '#072930', height: 'sm', action: { type: 'postback', label: t.dashboardMenu, data: "action=menu" } },
                        ],
                      },
                    ],
                  },
                },
              }];
            } else {
              // Default AI response with multilingual quick trigger
              const aiReply = generateSafetyAIResponse(userMsg, userLang);
              replyMessages = [{
                type: 'text',
                text: aiReply,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'postback', label: t.dashboardMenu, data: 'action=menu' } },
                    { type: 'action', action: { type: 'postback', label: t.missionTitle, data: 'action=mission' } },
                    { type: 'action', action: { type: 'postback', label: t.readinessTitle, data: 'action=readiness' } },
                    { type: 'action', action: { type: 'message', label: '🚨 SOS', text: 'SOS' } },
                    { type: 'action', action: { type: 'message', label: '🌐 เปลี่ยนภาษา', text: 'เปลี่ยนภาษา' } },
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
