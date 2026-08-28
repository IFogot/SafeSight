// scripts/create-and-upload-safesight-richmenu.mjs
// SafeSight EEC — Production LINE Rich Menu Generator & Publisher
// 3-Tier Layout: 6 Feature Boxes + Central Super Big Emergency SOS Button (2500x1686 px)

import fs from "fs";
import sharp from "sharp";

const LINE_CHANNEL_ACCESS_TOKEN = "fV8LlAcoEV3eiQ6pYN0vYqlHcXdNaDvOeo2GSBfEqoF7KXZNkPZkUR2+cvUaEh9Ecq7rBztCRtr/yqM6h4Y9sEj+6EZt/RCjfl/eHp8sVv4LZbsfU6Y2zZXCRmPhasr3NYIwziF3yYgSqRAu+OFLiwdB04t89/1O/w1cDnyilFU=";

async function run() {
  console.log("1. Generating 2500x1686 SafeSight 3-Tier Rich Menu (6 Boxes + Central Super Big SOS)...");

  const svgOverlay = `
  <svg width="2500" height="1686" viewBox="0 0 2500 1686" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradient -->
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#070913"/>
        <stop offset="50%" stop-color="#0b1026"/>
        <stop offset="100%" stop-color="#04060d"/>
      </linearGradient>

      <!-- Card Gradients -->
      <linearGradient id="cardGrad1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f43f8e" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#be185d" stop-opacity="0.12"/>
      </linearGradient>
      <linearGradient id="cardGrad2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#047857" stop-opacity="0.12"/>
      </linearGradient>
      <linearGradient id="cardGrad3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#6d28d9" stop-opacity="0.12"/>
      </linearGradient>

      <!-- SUPER BIG SOS GRADIENT (Glowing Danger Red / Amber) -->
      <linearGradient id="sosGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ef4444"/>
        <stop offset="50%" stop-color="#b91c1c"/>
        <stop offset="100%" stop-color="#7f1d1d"/>
      </linearGradient>
      <linearGradient id="sosBorderGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#fca5a5"/>
        <stop offset="50%" stop-color="#ef4444"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>

      <linearGradient id="cardGrad4" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#4338ca" stop-opacity="0.12"/>
      </linearGradient>
      <linearGradient id="cardGrad5" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#0e7490" stop-opacity="0.12"/>
      </linearGradient>
      <linearGradient id="cardGrad6" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#a21caf" stop-opacity="0.12"/>
      </linearGradient>
    </defs>

    <rect width="2500" height="1686" fill="url(#bgGrad)" />

    <!-- ══════════════ TIER 1 (TOP ROW: y=0..620) ══════════════ -->
    
    <!-- Grid 1: Daily Mission (0, 0, 833, 620) -->
    <g transform="translate(18, 18)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad1)" stroke="#f43f8e" stroke-width="5" stroke-opacity="0.75"/>
      <circle cx="398" cy="160" r="76" fill="#f43f8e" fill-opacity="0.25" stroke="#f43f8e" stroke-width="3"/>
      <text x="398" y="195" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="bold" fill="#f43f8e" text-anchor="middle">⚡</text>
      <text x="398" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">ภารกิจ 1 อย่าง</text>
      <text x="398" y="380" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#fbcfe8" text-anchor="middle">ดื่มน้ำ · ตรวจสาย Harness (+50 XP)</text>
      <rect x="150" y="440" width="497" height="96" rx="26" fill="#f43f8e" />
      <text x="398" y="502" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">แตะรับภารกิจวันนี้</text>
    </g>

    <!-- Grid 2: Readiness Score (833, 0, 834, 620) -->
    <g transform="translate(851, 18)">
      <rect width="798" height="584" rx="36" fill="url(#cardGrad2)" stroke="#10b981" stroke-width="5" stroke-opacity="0.75"/>
      <circle cx="399" cy="160" r="76" fill="#10b981" fill-opacity="0.25" stroke="#10b981" stroke-width="3"/>
      <text x="399" y="195" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="bold" fill="#10b981" text-anchor="middle">🔋</text>
      <text x="399" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">คะแนนความพร้อม</text>
      <text x="399" y="380" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#a7f3d0" text-anchor="middle">หมวก · เสื้อ · แว่นตา (98/100)</text>
      <rect x="150" y="440" width="498" height="96" rx="26" fill="#10b981" />
      <text x="399" y="502" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">ดูความพร้อม PPE</text>
    </g>

    <!-- Grid 3: EEC Silent Risk Radar (1667, 0, 833, 620) -->
    <g transform="translate(1685, 18)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad3)" stroke="#a855f7" stroke-width="5" stroke-opacity="0.75"/>
      <circle cx="398" cy="160" r="76" fill="#a855f7" fill-opacity="0.25" stroke="#a855f7" stroke-width="3"/>
      <text x="398" y="195" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="bold" fill="#a855f7" text-anchor="middle">📡</text>
      <text x="398" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">เรดาร์จุดเสี่ยง EEC</text>
      <text x="398" y="380" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#e9d5ff" text-anchor="middle">ตรวจจับแก๊ส H2S &amp; เสียง 24/7</text>
      <rect x="150" y="440" width="497" height="96" rx="26" fill="#a855f7" />
      <text x="398" y="502" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">เปิดตรวจเรดาร์</text>
    </g>

    <!-- ══════════════ TIER 2 (SUPER BIG EMERGENCY SOS: y=620..1066) ══════════════ -->
    <g transform="translate(18, 626)">
      <!-- Pulsing Outer Glow -->
      <rect width="2464" height="414" rx="42" fill="#ef4444" fill-opacity="0.15" />
      <rect x="6" y="6" width="2452" height="402" rx="38" fill="url(#sosGrad)" stroke="url(#sosBorderGrad)" stroke-width="8"/>
      
      <!-- Danger Striping Accents on sides -->
      <path d="M 60 40 L 100 40 L 40 370 L 0 370 Z" fill="#ffffff" fill-opacity="0.12"/>
      <path d="M 120 40 L 160 40 L 100 370 L 60 370 Z" fill="#ffffff" fill-opacity="0.12"/>
      <path d="M 2340 40 L 2380 40 L 2320 370 L 2280 370 Z" fill="#ffffff" fill-opacity="0.12"/>
      <path d="M 2400 40 L 2440 40 L 2380 370 L 2340 370 Z" fill="#ffffff" fill-opacity="0.12"/>

      <!-- Center Icon & Labels -->
      <circle cx="340" cy="207" r="105" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-width="5"/>
      <text x="340" y="255" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="120" font-weight="bold" fill="#ffffff" text-anchor="middle">🚨</text>

      <text x="1270" y="165" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">🚨 SOS ฉุกเฉิน EEC · กดขอความช่วยเหลือทันที 🚨</text>
      <text x="1270" y="245" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#fef08a" text-anchor="middle">📞 โทร 1669 กู้ภัยการแพทย์ | ส่งพิกัดถึง Safety Officer ทุกโซนอัตโนมัติ</text>
      <text x="1270" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#fee2e2" text-anchor="middle">EMERGENCY ASSISTANCE · အရေးပေါ်အကူအညီ · សង្គ្រោះបន្ទាន់ · ສຸກເສີນ</text>

      <circle cx="2200" cy="207" r="105" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-width="5"/>
      <text x="2200" y="255" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="120" font-weight="bold" fill="#ffffff" text-anchor="middle">🆘</text>
    </g>

    <!-- ══════════════ TIER 3 (BOTTOM ROW: y=1066..1686) ══════════════ -->
    
    <!-- Grid 4: 30-sec Check-in (0, 1066, 833, 620) -->
    <g transform="translate(18, 1072)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad4)" stroke="#6366f1" stroke-width="5" stroke-opacity="0.75"/>
      <circle cx="398" cy="160" r="76" fill="#6366f1" fill-opacity="0.25" stroke="#6366f1" stroke-width="3"/>
      <text x="398" y="195" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="bold" fill="#6366f1" text-anchor="middle">📝</text>
      <text x="398" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">เช็กอิน 30 วินาที</text>
      <text x="398" y="380" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#c7d2fe" text-anchor="middle">ยืนยัน PPE ก่อนเริ่มงานทุกกะ</text>
      <rect x="150" y="440" width="497" height="96" rx="26" fill="#6366f1" />
      <text x="398" y="502" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">เช็กอินความปลอดภัย</text>
    </g>

    <!-- Grid 5: AI Vision YOLOv8 (833, 1066, 834, 620) -->
    <g transform="translate(851, 1072)">
      <rect width="798" height="584" rx="36" fill="url(#cardGrad5)" stroke="#06b6d4" stroke-width="5" stroke-opacity="0.75"/>
      <circle cx="399" cy="160" r="76" fill="#06b6d4" fill-opacity="0.25" stroke="#06b6d4" stroke-width="3"/>
      <text x="399" y="195" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="bold" fill="#06b6d4" text-anchor="middle">📷</text>
      <text x="399" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">ตรวจจับ AI Vision</text>
      <text x="399" y="380" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#a5f3fc" text-anchor="middle">สแกนหมวก เสื้อ แว่น จุดเสี่ยง</text>
      <rect x="150" y="440" width="498" height="96" rx="26" fill="#06b6d4" />
      <text x="399" y="502" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">ส่งภาพสแกน AI</text>
    </g>

    <!-- Grid 6: Language Switcher & Safety AI (1667, 1066, 833, 620) -->
    <g transform="translate(1685, 1072)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad6)" stroke="#ec4899" stroke-width="5" stroke-opacity="0.75"/>
      <circle cx="398" cy="160" r="76" fill="#ec4899" fill-opacity="0.25" stroke="#ec4899" stroke-width="3"/>
      <text x="398" y="195" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="76" font-weight="bold" fill="#ec4899" text-anchor="middle">🌐</text>
      <text x="398" y="315" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">เปลี่ยนภาษา / Language</text>
      <text x="398" y="380" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="34" font-weight="500" fill="#fbcfe8" text-anchor="middle">🇹🇭 ไทย | 🇬🇧 EN | 🇲🇲 MY | 🇰🇭 KM | 🇱🇦 LO</text>
      <rect x="150" y="440" width="497" height="96" rx="26" fill="#ec4899" />
      <text x="398" y="502" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">เลือกภาษา / Language</text>
    </g>
  </svg>
  `;

  if (!fs.existsSync("public")) fs.mkdirSync("public", { recursive: true });

  const imageBuffer = await sharp(Buffer.from(svgOverlay))
    .png()
    .toBuffer();

  fs.writeFileSync("public/safesight-richmenu.png", imageBuffer);
  console.log("Rich Menu image successfully generated at public/safesight-richmenu.png");

  // 2. Create SafeSight 3-Tier 7-Zone Rich Menu Object
  console.log("2. Creating SafeSight 3-Tier 7-Zone Rich Menu object via LINE Messaging API...");
  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "SafeSight EEC 3-Tier Super SOS Rich Menu",
    chatBarText: "SafeSight 🚨",
    areas: [
      // Tier 1 (Top Row: y=0..620)
      {
        bounds: { x: 0, y: 0, width: 833, height: 620 },
        action: { type: "message", text: "ขอภารกิจวันนี้" },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 620 },
        action: { type: "message", text: "คะแนนความพร้อม" },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 620 },
        action: { type: "message", text: "เรดาร์ความเสี่ยง" },
      },
      // Tier 2 (Middle: SUPER BIG EMERGENCY BUTTON y=620..1066, w=2500)
      {
        bounds: { x: 0, y: 620, width: 2500, height: 446 },
        action: { type: "message", text: "SOS" },
      },
      // Tier 3 (Bottom Row: y=1066..1686)
      {
        bounds: { x: 0, y: 1066, width: 833, height: 620 },
        action: { type: "message", text: "เช็กอินวันนี้" },
      },
      {
        bounds: { x: 833, y: 1066, width: 834, height: 620 },
        action: { type: "message", text: "ส่งภาพตรวจ AI" },
      },
      {
        bounds: { x: 1667, y: 1066, width: 833, height: 620 },
        action: { type: "message", text: "เปลี่ยนภาษา" },
      },
    ],
  };

  const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(richMenuPayload),
  });

  const createData = await createRes.json();
  console.log("Create Rich Menu response:", createData);

  if (!createRes.ok || !createData.richMenuId) {
    console.error("Failed to create rich menu object:", createData);
    return;
  }

  const richMenuId = createData.richMenuId;
  console.log("Created Rich Menu ID:", richMenuId);

  // 3. Upload Image to LINE Data Endpoint
  console.log("3. Uploading 2500x1686 PNG image to LINE Data Endpoint...");
  const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      "Content-Type": "image/png",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error("Failed to upload rich menu image:", uploadRes.status, errText);
    return;
  }
  console.log("Successfully uploaded 2500x1686 PNG image to Rich Menu!");

  // 4. Set as Default Rich Menu for ALL LINE users
  console.log("4. Setting as Default Rich Menu for all users of @095teptf...");
  const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  if (defaultRes.ok) {
    console.log("🎉 SUCCESS! SafeSight 3-Tier Super SOS Rich Menu is now LIVE and ACTIVE for all users on LINE Official Account @095teptf!");
  } else {
    const errText = await defaultRes.text();
    console.error("Failed to set default rich menu:", errText);
  }
}

run().catch(console.error);
