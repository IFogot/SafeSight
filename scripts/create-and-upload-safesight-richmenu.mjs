// scripts/create-and-upload-safesight-richmenu.mjs
// SafeSight EEC — Production LINE Rich Menu Generator & Publisher
// 3-Tier Layout: 6 Feature Boxes (Big 4-Language Typography, No Logos) + Central Super Big Emergency SOS Button (2500x1686 px)

import fs from "fs";
import sharp from "sharp";

const LINE_CHANNEL_ACCESS_TOKEN = "fV8LlAcoEV3eiQ6pYN0vYqlHcXdNaDvOeo2GSBfEqoF7KXZNkPZkUR2+cvUaEh9Ecq7rBztCRtr/yqM6h4Y9sEj+6EZt/RCjfl/eHp8sVv4LZbsfU6Y2zZXCRmPhasr3NYIwziF3yYgSqRAu+OFLiwdB04t89/1O/w1cDnyilFU=";

async function run() {
  console.log("1. Generating 2500x1686 SafeSight 3-Tier Rich Menu (No Logos, Big 4-Language Typography)...");

  const svgOverlay = `
  <svg width="2500" height="1686" viewBox="0 0 2500 1686" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradient -->
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#050814"/>
        <stop offset="50%" stop-color="#091024"/>
        <stop offset="100%" stop-color="#03050c"/>
      </linearGradient>

      <!-- Card Gradients -->
      <linearGradient id="cardGrad1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f43f8e" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#be185d" stop-opacity="0.10"/>
      </linearGradient>
      <linearGradient id="cardGrad2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#047857" stop-opacity="0.10"/>
      </linearGradient>
      <linearGradient id="cardGrad3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#6d28d9" stop-opacity="0.10"/>
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
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#4338ca" stop-opacity="0.10"/>
      </linearGradient>
      <linearGradient id="cardGrad5" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#0e7490" stop-opacity="0.10"/>
      </linearGradient>
      <linearGradient id="cardGrad6" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#a21caf" stop-opacity="0.10"/>
      </linearGradient>
    </defs>

    <rect width="2500" height="1686" fill="url(#bgGrad)" />

    <!-- ══════════════ TIER 1 (TOP ROW: y=0..620) ══════════════ -->
    
    <!-- Grid 1: Daily Mission (0, 0, 833, 620) -->
    <g transform="translate(18, 18)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad1)" stroke="#f43f8e" stroke-width="5" stroke-opacity="0.8"/>
      
      <!-- 4 BIG TEXT LANGUAGES (NO LOGO) -->
      <!-- 1. Thai -->
      <text x="398" y="115" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">ภารกิจวันนี้ (+50 XP)</text>
      <!-- 2. English -->
      <text x="398" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#fbcfe8" text-anchor="middle">Daily Safety Mission</text>
      <!-- 3. Burmese -->
      <text x="398" y="305" font-family="'Padauk', 'Myanmar Text', sans-serif" font-size="50" font-weight="bold" fill="#f472b6" text-anchor="middle">နေ့စဉ် ဘေးကင်းရေး တာဝန်</text>
      <!-- 4. Khmer -->
      <text x="398" y="400" font-family="'Hanuman', 'Khmer OS', sans-serif" font-size="46" font-weight="bold" fill="#f9a8d4" text-anchor="middle">បេសកកម្មសុវត្ថិភាពប្រចាំថ្ងៃ</text>

      <rect x="90" y="460" width="617" height="88" rx="24" fill="#f43f8e" />
      <text x="398" y="520" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">แตะรับภารกิจ · Tap to Start</text>
    </g>

    <!-- Grid 2: Readiness Score (833, 0, 834, 620) -->
    <g transform="translate(851, 18)">
      <rect width="798" height="584" rx="36" fill="url(#cardGrad2)" stroke="#10b981" stroke-width="5" stroke-opacity="0.8"/>
      
      <!-- 4 BIG TEXT LANGUAGES (NO LOGO) -->
      <!-- 1. Thai -->
      <text x="399" y="115" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">คะแนนความพร้อม (98%)</text>
      <!-- 2. English -->
      <text x="399" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#a7f3d0" text-anchor="middle">PPE Readiness Score</text>
      <!-- 3. Burmese -->
      <text x="399" y="305" font-family="'Padauk', 'Myanmar Text', sans-serif" font-size="50" font-weight="bold" fill="#34d399" text-anchor="middle">PPE အဆင်သင့်ရမှတ်</text>
      <!-- 4. Khmer -->
      <text x="399" y="400" font-family="'Hanuman', 'Khmer OS', sans-serif" font-size="46" font-weight="bold" fill="#6ee7b7" text-anchor="middle">ពិន្ទុត្រៀមខ្លួន PPE</text>

      <rect x="90" y="460" width="618" height="88" rx="24" fill="#10b981" />
      <text x="399" y="520" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">ดูความพร้อม PPE · View Score</text>
    </g>

    <!-- Grid 3: EEC Silent Risk Radar (1667, 0, 833, 620) -->
    <g transform="translate(1685, 18)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad3)" stroke="#a855f7" stroke-width="5" stroke-opacity="0.8"/>
      
      <!-- 4 BIG TEXT LANGUAGES (NO LOGO) -->
      <!-- 1. Thai -->
      <text x="398" y="115" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">เรดาร์จุดเสี่ยง EEC</text>
      <!-- 2. English -->
      <text x="398" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#e9d5ff" text-anchor="middle">Silent Risk Radar</text>
      <!-- 3. Burmese -->
      <text x="398" y="305" font-family="'Padauk', 'Myanmar Text', sans-serif" font-size="50" font-weight="bold" fill="#c084fc" text-anchor="middle">ဘေးအန္တရာယ် ရေဒါ</text>
      <!-- 4. Khmer -->
      <text x="398" y="400" font-family="'Hanuman', 'Khmer OS', sans-serif" font-size="46" font-weight="bold" fill="#d8b4fe" text-anchor="middle">រ៉ាដាគ្រោះថ្នាក់ EEC</text>

      <rect x="90" y="460" width="617" height="88" rx="24" fill="#a855f7" />
      <text x="398" y="520" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">เปิดตรวจเรดาร์ · Open Radar</text>
    </g>

    <!-- ══════════════ TIER 2 (SUPER BIG EMERGENCY SOS: y=620..1066) ══════════════ -->
    <g transform="translate(18, 626)">
      <!-- Pulsing Danger Red Container -->
      <rect width="2464" height="414" rx="42" fill="#ef4444" fill-opacity="0.2" />
      <rect x="6" y="6" width="2452" height="402" rx="38" fill="url(#sosGrad)" stroke="url(#sosBorderGrad)" stroke-width="8"/>
      
      <!-- Danger Striping Accents on sides -->
      <path d="M 60 30 L 110 30 L 40 380 L -10 380 Z" fill="#ffffff" fill-opacity="0.14"/>
      <path d="M 140 30 L 190 30 L 120 380 L 70 380 Z" fill="#ffffff" fill-opacity="0.14"/>
      <path d="M 2320 30 L 2370 30 L 2300 380 L 2250 380 Z" fill="#ffffff" fill-opacity="0.14"/>
      <path d="M 2400 30 L 2450 30 L 2380 380 L 2330 380 Z" fill="#ffffff" fill-opacity="0.14"/>

      <!-- 4 BIG EMERGENCY TEXTS (NO LOGOS) -->
      <!-- 1. Thai Super Big -->
      <text x="1232" y="118" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="88" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">🚨 SOS ฉุกเฉิน EEC · ขอความช่วยเหลือทันที 🚨</text>
      
      <!-- 2. English Super Big -->
      <text x="1232" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="3">EMERGENCY ASSISTANCE · CALL 1669</text>
      
      <!-- 3. Burmese & Khmer Super Big -->
      <text x="1232" y="295" font-family="'Padauk', 'Hanuman', sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">အရေးပေါ် အကူအညီ  ·  សង្គ្រោះបន្ទាន់  ·  ສຸກເສີນ 1669</text>

      <!-- Subtitle Hotline -->
      <text x="1232" y="365" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="36" font-weight="bold" fill="#fecaca" text-anchor="middle">📞 โทร 1669 กู้ภัยการแพทย์ EEC | ส่งพิกัด GPS ถึง Safety Officer ทุกโซนอัตโนมัติ</text>
    </g>

    <!-- ══════════════ TIER 3 (BOTTOM ROW: y=1066..1686) ══════════════ -->
    
    <!-- Grid 4: 30-sec Check-in (0, 1066, 833, 620) -->
    <g transform="translate(18, 1072)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad4)" stroke="#6366f1" stroke-width="5" stroke-opacity="0.8"/>
      
      <!-- 4 BIG TEXT LANGUAGES (NO LOGO) -->
      <!-- 1. Thai -->
      <text x="398" y="115" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">เช็กอิน 30 วินาที</text>
      <!-- 2. English -->
      <text x="398" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#c7d2fe" text-anchor="middle">Pre-Shift Safety Check</text>
      <!-- 3. Burmese -->
      <text x="398" y="305" font-family="'Padauk', 'Myanmar Text', sans-serif" font-size="50" font-weight="bold" fill="#818cf8" text-anchor="middle">စစ်ဆေး ဝင်ရောက်ခြင်း</text>
      <!-- 4. Khmer -->
      <text x="398" y="400" font-family="'Hanuman', 'Khmer OS', sans-serif" font-size="46" font-weight="bold" fill="#a5b4fc" text-anchor="middle">ការពិនិត្យចូលសុវត្ថិភាព</text>

      <rect x="90" y="460" width="617" height="88" rx="24" fill="#6366f1" />
      <text x="398" y="520" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">เช็กอินความปลอดภัย · Check-in</text>
    </g>

    <!-- Grid 5: AI Vision YOLOv8 (833, 1066, 834, 620) -->
    <g transform="translate(851, 1072)">
      <rect width="798" height="584" rx="36" fill="url(#cardGrad5)" stroke="#06b6d4" stroke-width="5" stroke-opacity="0.8"/>
      
      <!-- 4 BIG TEXT LANGUAGES (NO LOGO) -->
      <!-- 1. Thai -->
      <text x="399" y="115" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">ตรวจจับ AI Vision</text>
      <!-- 2. English -->
      <text x="399" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#a5f3fc" text-anchor="middle">YOLOv8 AI Scan</text>
      <!-- 3. Burmese -->
      <text x="399" y="305" font-family="'Padauk', 'Myanmar Text', sans-serif" font-size="50" font-weight="bold" fill="#22d3ee" text-anchor="middle">AI စကင်န်ဖတ်ခြင်း</text>
      <!-- 4. Khmer -->
      <text x="399" y="400" font-family="'Hanuman', 'Khmer OS', sans-serif" font-size="46" font-weight="bold" fill="#67e8f9" text-anchor="middle">ស្កេនរូបភាពសុវត្ថិភាព AI</text>

      <rect x="90" y="460" width="618" height="88" rx="24" fill="#06b6d4" />
      <text x="399" y="520" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">ส่งภาพตรวจ AI · Send Photo</text>
    </g>

    <!-- Grid 6: Language Switcher & Safety AI (1667, 1066, 833, 620) -->
    <g transform="translate(1685, 1072)">
      <rect width="797" height="584" rx="36" fill="url(#cardGrad6)" stroke="#ec4899" stroke-width="5" stroke-opacity="0.8"/>
      
      <!-- 4 BIG TEXT LANGUAGES (NO LOGO) -->
      <!-- 1. Thai -->
      <text x="398" y="115" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle">เปลี่ยนภาษา / Language</text>
      <!-- 2. English -->
      <text x="398" y="210" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="52" font-weight="bold" fill="#fbcfe8" text-anchor="middle">Choose Your Language</text>
      <!-- 3. Burmese -->
      <text x="398" y="305" font-family="'Padauk', 'Myanmar Text', sans-serif" font-size="50" font-weight="bold" fill="#f472b6" text-anchor="middle">ဘာသာစကား ပြောင်းပါ</text>
      <!-- 4. Khmer -->
      <text x="398" y="400" font-family="'Hanuman', 'Khmer OS', sans-serif" font-size="46" font-weight="bold" fill="#f9a8d4" text-anchor="middle">ប្តូរភាសាអ្នកប្រើប្រាស់</text>

      <rect x="90" y="460" width="617" height="88" rx="24" fill="#ec4899" />
      <text x="398" y="520" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">🇹🇭 ไทย · 🇬🇧 EN · 🇲🇲 MY · 🇰🇭 KM</text>
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
    name: "SafeSight EEC 3-Tier Multilingual SOS Rich Menu (4 Languages)",
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
    console.log("🎉 SUCCESS! SafeSight 3-Tier 4-Language Super SOS Rich Menu is now LIVE and ACTIVE for all users on LINE Official Account @095teptf!");
  } else {
    const errText = await defaultRes.text();
    console.error("Failed to set default rich menu:", errText);
  }
}

run().catch(console.error);
