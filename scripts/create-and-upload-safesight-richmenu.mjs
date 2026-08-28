// scripts/create-and-upload-safesight-richmenu.mjs
// SafeSight EEC — Production LINE Rich Menu Generator & Publisher
// Creates 2500x1686 6-Tile Neon Grid Rich Menu and sets as default for all users

import fs from "fs";
import sharp from "sharp";

const LINE_CHANNEL_ACCESS_TOKEN = "fV8LlAcoEV3eiQ6pYN0vYqlHcXdNaDvOeo2GSBfEqoF7KXZNkPZkUR2+cvUaEh9Ecq7rBztCRtr/yqM6h4Y9sEj+6EZt/RCjfl/eHp8sVv4LZbsfU6Y2zZXCRmPhasr3NYIwziF3yYgSqRAu+OFLiwdB04t89/1O/w1cDnyilFU=";

async function run() {
  console.log("1. Generating 2500x1686 SafeSight Rich Menu Banner with 6-Grid Glassmorphic UI...");

  const svgOverlay = `
  <svg width="2500" height="1686" viewBox="0 0 2500 1686" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#080410"/>
        <stop offset="50%" stop-color="#10061e"/>
        <stop offset="100%" stop-color="#05020a"/>
      </linearGradient>
      <linearGradient id="cardGrad1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f43f8e" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#be185d" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="cardGrad2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#047857" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="cardGrad3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#6d28d9" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="cardGrad4" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#4338ca" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="cardGrad5" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#0e7490" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="cardGrad6" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#a21caf" stop-opacity="0.15"/>
      </linearGradient>
    </defs>

    <rect width="2500" height="1686" fill="url(#bgGrad)" />

    <!-- Grid 1: 1 Safety Mission (0, 0, 833, 843) -->
    <g transform="translate(24, 24)">
      <rect width="785" height="795" rx="44" fill="url(#cardGrad1)" stroke="#f43f8e" stroke-width="6" stroke-opacity="0.7"/>
      <circle cx="392" cy="240" r="115" fill="#f43f8e" fill-opacity="0.25" stroke="#f43f8e" stroke-width="4"/>
      <text x="392" y="280" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="110" font-weight="bold" fill="#f43f8e" text-anchor="middle">⚡</text>
      <text x="392" y="475" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">ภารกิจ 1 อย่าง</text>
      <text x="392" y="555" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="40" font-weight="500" fill="#fbcfe8" text-anchor="middle">ดื่มน้ำ · ตรวจสาย Harness</text>
      <rect x="140" y="620" width="505" height="110" rx="30" fill="#f43f8e" />
      <text x="392" y="692" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">แตะรับภารกิจวันนี้</text>
    </g>

    <!-- Grid 2: PPE Readiness Score (833, 0, 834, 843) -->
    <g transform="translate(857, 24)">
      <rect width="786" height="795" rx="44" fill="url(#cardGrad2)" stroke="#10b981" stroke-width="6" stroke-opacity="0.7"/>
      <circle cx="393" cy="240" r="115" fill="#10b981" fill-opacity="0.25" stroke="#10b981" stroke-width="4"/>
      <text x="393" y="280" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="110" font-weight="bold" fill="#10b981" text-anchor="middle">🔋</text>
      <text x="393" y="475" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">คะแนนความพร้อม</text>
      <text x="393" y="555" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="40" font-weight="500" fill="#a7f3d0" text-anchor="middle">หมวก · เสื้อ · แว่นตา</text>
      <rect x="140" y="620" width="506" height="110" rx="30" fill="#10b981" />
      <text x="393" y="692" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">ดูความพร้อม 98/100</text>
    </g>

    <!-- Grid 3: EEC Silent Hazard Radar (1667, 0, 833, 843) -->
    <g transform="translate(1691, 24)">
      <rect width="785" height="795" rx="44" fill="url(#cardGrad3)" stroke="#a855f7" stroke-width="6" stroke-opacity="0.7"/>
      <circle cx="392" cy="240" r="115" fill="#a855f7" fill-opacity="0.25" stroke="#a855f7" stroke-width="4"/>
      <text x="392" y="280" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="110" font-weight="bold" fill="#a855f7" text-anchor="middle">📡</text>
      <text x="392" y="475" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">เรดาร์จุดเสี่ยง EEC</text>
      <text x="392" y="555" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="40" font-weight="500" fill="#e9d5ff" text-anchor="middle">ตรวจจับแก๊ส &amp; เสียง 24/7</text>
      <rect x="140" y="620" width="505" height="110" rx="30" fill="#a855f7" />
      <text x="392" y="692" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">เปิดตรวจเรดาร์</text>
    </g>

    <!-- Grid 4: 30-sec Safety Check-in (0, 843, 833, 843) -->
    <g transform="translate(24, 867)">
      <rect width="785" height="795" rx="44" fill="url(#cardGrad4)" stroke="#6366f1" stroke-width="6" stroke-opacity="0.7"/>
      <circle cx="392" cy="240" r="115" fill="#6366f1" fill-opacity="0.25" stroke="#6366f1" stroke-width="4"/>
      <text x="392" y="280" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="110" font-weight="bold" fill="#6366f1" text-anchor="middle">📝</text>
      <text x="392" y="475" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">เช็กอิน 30 วินาที</text>
      <text x="392" y="555" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="40" font-weight="500" fill="#c7d2fe" text-anchor="middle">ยืนยัน PPE ก่อนเริ่มงาน</text>
      <rect x="140" y="620" width="505" height="110" rx="30" fill="#6366f1" />
      <text x="392" y="692" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">เช็กอินความปลอดภัย</text>
    </g>

    <!-- Grid 5: AI Vision YOLOv8 Scan (833, 843, 834, 843) -->
    <g transform="translate(857, 867)">
      <rect width="786" height="795" rx="44" fill="url(#cardGrad5)" stroke="#06b6d4" stroke-width="6" stroke-opacity="0.7"/>
      <circle cx="393" cy="240" r="115" fill="#06b6d4" fill-opacity="0.25" stroke="#06b6d4" stroke-width="4"/>
      <text x="393" y="280" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="110" font-weight="bold" fill="#06b6d4" text-anchor="middle">📷</text>
      <text x="393" y="475" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">ตรวจจับ AI Vision</text>
      <text x="393" y="555" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="40" font-weight="500" fill="#a5f3fc" text-anchor="middle">สแกน PPE &amp; จุดเสี่ยง</text>
      <rect x="140" y="620" width="506" height="110" rx="30" fill="#06b6d4" />
      <text x="393" y="692" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">ส่งภาพสแกน AI</text>
    </g>

    <!-- Grid 6: Consult Safety AI Officer (1667, 843, 833, 843) -->
    <g transform="translate(1691, 867)">
      <rect width="785" height="795" rx="44" fill="url(#cardGrad6)" stroke="#ec4899" stroke-width="6" stroke-opacity="0.7"/>
      <circle cx="392" cy="240" r="115" fill="#ec4899" fill-opacity="0.25" stroke="#ec4899" stroke-width="4"/>
      <text x="392" y="280" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="110" font-weight="bold" fill="#ec4899" text-anchor="middle">🛡️</text>
      <text x="392" y="475" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">ปรึกษา Safety AI</text>
      <text x="392" y="555" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="40" font-weight="500" fill="#fbcfe8" text-anchor="middle">ถามกฎ OSH &amp; ปฐมพยาบาล</text>
      <rect x="140" y="620" width="505" height="110" rx="30" fill="#ec4899" />
      <text x="392" y="692" font-family="'Sarabun', 'Anuphan', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">คุยกับ Safety AI</text>
    </g>
  </svg>
  `;

  if (!fs.existsSync("public")) fs.mkdirSync("public", { recursive: true });

  const imageBuffer = await sharp(Buffer.from(svgOverlay))
    .png()
    .toBuffer();

  fs.writeFileSync("public/safesight-richmenu.png", imageBuffer);
  console.log("Rich Menu image successfully generated at public/safesight-richmenu.png");

  // 2. Create SafeSight Rich Menu Object
  console.log("2. Creating SafeSight Rich Menu object via LINE Messaging API...");
  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "SafeSight EEC Safety Rich Menu",
    chatBarText: "เมนู SafeSight",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "ขอภารกิจวันนี้" },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", text: "คะแนนความพร้อม" },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "เรดาร์ความเสี่ยง" },
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "เช็กอินวันนี้" },
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "message", text: "ส่งภาพตรวจ AI" },
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "ปรึกษา Safety AI" },
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
    console.log("🎉 SUCCESS! SafeSight 6-Tile Rich Menu is now LIVE and ACTIVE for all users on LINE Official Account @095teptf!");
  } else {
    const errText = await defaultRes.text();
    console.error("Failed to set default rich menu:", errText);
  }
}

run().catch(console.error);
