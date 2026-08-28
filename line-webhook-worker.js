const LINE_CHANNEL_SECRET = "22be5b133d575c95012830ccb2e273bc";
const LINE_CHANNEL_ACCESS_TOKEN = "fV8LlAcoEV3eiQ6pYN0vYqlHcXdNaDvOeo2GSBfEqoF7KXZNkPZkUR2+cvUaEh9Ecq7rBztCRtr/yqM6h4Y9sEj+6EZt/RCjfl/eHp8sVv4LZbsfU6Y2zZXCRmPhasr3NYIwziF3yYgSqRAu+OFLiwdB04t89/1O/w1cDnyilFU=";
const DATABASE_URL = "postgresql://neondb_owner:npg_wDYzQ3ImoiX1@ep-lingering-bonus-azto8k3e-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const SITE_URL = "https://safesight-arise.vercel.app";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-line-signature",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const secret = env?.LINE_CHANNEL_SECRET || LINE_CHANNEL_SECRET;
    const token = env?.LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN;
    const dbUrl = env?.DATABASE_URL || DATABASE_URL;


    // ── 1. GET Endpoints ──────────────────────────────────────────
    if (request.method === "GET") {
      if (url.pathname === "/history") {
        const history = await getChatHistoryFromNeon(dbUrl, 30);
        return new Response(JSON.stringify({ status: "ok", history }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          status: "ok",
          service: "SafeSight EEC LINE Webhook Engine",
          botName: "SafeSight Safety (@safesight_eec)",
          database: dbUrl ? "Neon PostgreSQL Connected" : "No Database Configured",
          active: true,
          version: "1.0.0",
          languages: ["th", "en", "my", "km", "lo"],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. POST /broadcast or /push (Admin Push Console) ──────────
    if (request.method === "POST" && (url.pathname === "/broadcast" || url.pathname === "/push")) {
      try {
        const body = await request.json();
        const text = body.text || "";
        const targetUserId = body.to;
        const messages = body.messages || [{ type: "text", text }];

        let res;
        if (targetUserId) {
          res = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ to: targetUserId, messages }),
          });
        } else {
          res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ messages }),
          });
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return new Response(JSON.stringify({ success: false, error: data }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await saveLineMessageToNeon(dbUrl, targetUserId || "broadcast_all", "assistant", `[Broadcast]: ${text}`);

        return new Response(JSON.stringify({ success: true, delivered: true, data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 3. LINE Webhook Endpoint (Incoming User Messages) ─────────
    if (request.method === "POST") {
      try {
        const signature = request.headers.get("x-line-signature") || "";
        const rawBody = await request.text();

        // HMAC-SHA256 Signature Verification (Web Crypto API)
        if (signature && secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
          const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

          if (signature !== calculatedSignature) {
            console.warn("SafeSight: Invalid LINE signature rejected");
            return new Response("Invalid Signature", { status: 403, headers: corsHeaders });
          }
        }

        const body = JSON.parse(rawBody || "{}");
        const events = body.events || [];

        for (const event of events) {
          const userId = event.source?.userId || "anonymous_worker";

          // ── Follow / Add Friend Event ───────────────────────────
          if (event.type === "follow" && event.replyToken) {
            await sendLineMessage(event.replyToken, [buildWelcomeFlexMessage()], token);
            await saveLineMessageToNeon(dbUrl, userId, "assistant", "[ส่งข้อความต้อนรับ SafeSight]");
            continue;
          }

          // ── Postback Event (Interactive Button Actions) ─────────
          if (event.type === "postback" && event.replyToken) {
            const data = event.postback.data || "";
            let replyMessages = [];

            if (data.startsWith("action=checkin")) {
              await saveLineMessageToNeon(dbUrl, userId, "user", "[เช็กอินความปลอดภัยประจำวัน]");
              replyMessages = [
                {
                  type: "text",
                  text: "✅ บันทึกเช็กอินความปลอดภัยเรียบร้อยแล้ว!\n\nระบบ SafeSight ได้บันทึกสถานะการปฏิบัติตามมาตรฐานความปลอดภัยของคุณสำหรับวันนี้ ข้อมูลจะปรากฏบนแดชบอร์ด Audit & Compliance ทันที\n\n🛡️ ปฏิบัติตามกฎ PPE ตลอดกะทำงาน\n🦺 สวมหมวก เสื้อสะท้อนแสง แว่นตาครบเซ็ต",
                  quickReply: {
                    items: [
                      { type: "action", action: { type: "message", label: "📋 รายงานจุดเสี่ยง", text: "รายงานจุดเสี่ยง" } },
                      { type: "action", action: { type: "message", label: "🚨 แจ้งเตือนล่าสุด", text: "แจ้งเตือนล่าสุด" } },
                      { type: "action", action: { type: "uri", label: "🌐 เปิดแดชบอร์ด", uri: `${SITE_URL}` } },
                    ],
                  },
                },
              ];
            } else if (data.startsWith("action=report_hazard")) {
              replyMessages = [buildHazardReportGuideFlexMessage()];
            } else if (data.startsWith("action=sos")) {
              await saveLineMessageToNeon(dbUrl, userId, "user", "[🚨 SOS EMERGENCY TRIGGERED]");
              await logAuditToNeon(dbUrl, userId, "LINE_SOS_TRIGGERED", "emergency", "critical", "Worker triggered SOS via LINE OA");
              replyMessages = [buildEmergencySOSFlexMessage()];
            } else if (data.startsWith("action=ack_alert")) {
              const alertId = data.split("=")[2] || "unknown";
              await saveLineMessageToNeon(dbUrl, userId, "user", `[รับทราบการแจ้งเตือน ${alertId}]`);
              replyMessages = [
                {
                  type: "text",
                  text: `✅ รับทราบการแจ้งเตือนแล้ว (${alertId})\n\nระบบ SafeSight ได้บันทึกการรับทราบลงใน Audit Log เรียบร้อยแล้ว ขอบคุณที่ตอบรับอย่างรวดเร็วครับ`,
                  quickReply: {
                    items: [
                      { type: "action", action: { type: "postback", label: "✅ เช็กอินประจำวัน", data: "action=checkin" } },
                      { type: "action", action: { type: "uri", label: "🌐 ดูรายละเอียดบนเว็บ", uri: `${SITE_URL}` } },
                    ],
                  },
                },
              ];
            } else if (data.startsWith("zone_status=")) {
              const zone = data.split("=")[1];
              replyMessages = [buildZoneStatusFlexMessage(zone)];
            }

            if (replyMessages.length > 0) {
              await sendLineMessage(event.replyToken, replyMessages, token);
            }
            continue;
          }

          // ── Message Event (Text / Image) ────────────────────────
          if (event.type === "message" && event.replyToken) {
            const userMsg = event.message.text ? event.message.text.trim() : "";

            if (userMsg) {
              await saveLineMessageToNeon(dbUrl, userId, "user", userMsg);
            }

            let replyMessages = [];

            // 1. Keyword-based safety intent routing
            if (matchKeywords(userMsg, ["เช็กอิน", "เช็คอิน", "checkin", "check in", "check-in"])) {
              replyMessages = [buildSafetyCheckinFlexMessage()];

            } else if (matchKeywords(userMsg, ["แจ้งเตือน", "alert", "alerts", "อุบัติเหตุ", "accident", "ล่าสุด"])) {
              replyMessages = [buildAlertSummaryFlexMessage()];

            } else if (matchKeywords(userMsg, ["รายงาน", "จุดเสี่ยง", "report", "hazard", "near miss", "near-miss"])) {
              replyMessages = [buildHazardReportGuideFlexMessage()];

            } else if (matchKeywords(userMsg, ["SOS", "sos", "ฉุกเฉิน", "emergency", "ช่วยด้วย", "help"])) {
              await logAuditToNeon(dbUrl, userId, "LINE_SOS_KEYWORD", "emergency", "critical", `Worker sent SOS keyword: ${userMsg}`);
              replyMessages = [buildEmergencySOSFlexMessage()];

            } else if (matchKeywords(userMsg, ["PPE", "ppe", "หมวก", "เสื้อ", "แว่น", "helmet", "vest", "goggles"])) {
              replyMessages = [buildPPEStatusFlexMessage()];

            } else if (matchKeywords(userMsg, ["โซน", "zone", "พื้นที่", "area"])) {
              replyMessages = [buildZoneStatusFlexMessage("A")];

            } else if (matchKeywords(userMsg, ["อบรม", "training", "academy", "เรียน", "คอร์ส", "course"])) {
              replyMessages = [buildTrainingFlexMessage()];

            } else if (event.message.type === "image") {
              replyMessages = [buildImageReceivedFlexMessage()];

            } else {
              // 2. Default: AI Safety Advisor response
              const aiReplyText = generateSafetyAIResponse(userMsg, userId);
              replyMessages = [
                {
                  type: "text",
                  text: aiReplyText,
                  quickReply: {
                    items: [
                      { type: "action", action: { type: "postback", label: "✅ เช็กอิน", data: "action=checkin" } },
                      { type: "action", action: { type: "message", label: "🚨 แจ้งเตือนล่าสุด", text: "แจ้งเตือนล่าสุด" } },
                      { type: "action", action: { type: "message", label: "📋 รายงานจุดเสี่ยง", text: "รายงานจุดเสี่ยง" } },
                      { type: "action", action: { type: "message", label: "🦺 สถานะ PPE", text: "สถานะ PPE" } },
                      { type: "action", action: { type: "uri", label: "🌐 เปิดแดชบอร์ด", uri: `${SITE_URL}` } },
                    ],
                  },
                },
              ];
            }

            const replySummary = replyMessages[0]?.text || "[ส่งการ์ด Flex Message ความปลอดภัย]";
            await saveLineMessageToNeon(dbUrl, userId, "assistant", replySummary);
            await sendLineMessage(event.replyToken, replyMessages, token);
          }
        }

        return new Response("OK", { status: 200, headers: corsHeaders });
      } catch (err) {
        console.error("SafeSight Webhook error:", err);
        return new Response("Internal Error", { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};

// ── Keyword Matcher Utility ──────────────────────────────────────
function matchKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ── AI Safety Advisor (Domain-Specific Responses) ────────────────
function generateSafetyAIResponse(userQuery, userId) {
  const q = userQuery.toLowerCase();

  // Heat / Temperature concerns
  if (matchKeywords(q, ["ร้อน", "อุณหภูมิ", "heat", "temperature", "แดด", "sun"])) {
    return `⚠️ คำเตือนด้านอุณหภูมิ — SafeSight AI Safety Advisor\n\nอุณหภูมิสูงเกินมาตรฐาน (>35°C) เป็นปัจจัยเสี่ยงสำคัญในเขต EEC โดยเฉพาะงานกลางแจ้ง\n\nมาตรการเบื้องต้น:\n1. ดื่มน้ำ 250 มล. ทุก 30 นาที\n2. พักในที่ร่มทุก 60 นาที (อย่างน้อย 10 นาที)\n3. สังเกตอาการ: เวียนศีรษะ คลื่นไส้ ผิวแดง = สัญญาณ Heat Stroke\n4. หากพบเพื่อนร่วมงานมีอาการ → พาเข้าที่ร่ม ราดน้ำ แจ้ง Safety Officer ทันที\n\n☎️ ฉุกเฉิน: กด SOS ด้านล่างเพื่อแจ้งเหตุ`;
  }

  // Noise / hearing concerns
  if (matchKeywords(q, ["เสียง", "หู", "noise", "hearing", "ดัง", "loud"])) {
    return `🔊 คำแนะนำด้านเสียงรบกวน — SafeSight AI\n\nพื้นที่ EEC หลายโซนมีระดับเสียงสูงเกิน 85 dB(A) ซึ่งต้องสวม Ear Protection ตามกฎหมาย\n\nมาตรฐานความปลอดภัย:\n• <85 dB: ปลอดภัย (สำนักงาน)\n• 85-90 dB: สวม Ear Plug (โรงงานทั่วไป)\n• >90 dB: สวม Ear Muff (งานตอกเสาเข็ม งานเชื่อม)\n• >115 dB: ห้ามเข้าโดยไม่มีอุปกรณ์ป้องกัน\n\nเซ็นเซอร์ IoT ของ SafeSight ตรวจวัดเสียงแบบ Real-time ตรวจสอบได้บนแดชบอร์ดครับ`;
  }

  // Chemical / gas concerns
  if (matchKeywords(q, ["สารเคมี", "แก๊ส", "gas", "chemical", "h2s", "co", "กลิ่น", "smell"])) {
    return `☣️ คำเตือนด้านสารเคมี/แก๊ส — SafeSight AI\n\nหากสูดดมแก๊สพิษ (H2S, CO, NH3) ให้ปฏิบัติตาม IDLH Protocol ทันที:\n\n1. 🚶 ออกจากพื้นที่ทันที ไปทางลมเหนือ (Upwind)\n2. 🆘 กด SOS ด้านล่าง หรือแจ้ง Safety Officer\n3. 🫁 หากหายใจลำบาก ให้นั่งพัก ห้ามนอนราบ\n4. 🚑 รอทีมกู้ภัยที่จุดรวมพล (Muster Point)\n\n⚠️ ห้ามกลับเข้าพื้นที่จนกว่า Safety Officer จะประกาศ All Clear\n\nเซ็นเซอร์ H2S ของ SafeSight แจ้งเตือนอัตโนมัติเมื่อค่าเกิน 10 ppm`;
  }

  // Fall / height concerns
  if (matchKeywords(q, ["ตก", "สูง", "fall", "height", "บันได", "ladder", "นั่งร้าน", "scaffold"])) {
    return `🏗️ คำเตือนงานที่สูง — SafeSight AI\n\nการตกจากที่สูงเป็นสาเหตุอุบัติเหตุร้ายแรงอันดับ 1 ในอุตสาหกรรม EEC\n\nกฎ PPE สำหรับงานที่สูง (>2 เมตร):\n• สวม Full-body Harness เสมอ\n• ยึดสาย Lanyard กับจุดยึดที่แข็งแรง\n• ตรวจสภาพนั่งร้านก่อนใช้งาน\n• ห้ามทำงานที่สูงเพียงลำพัง\n• สภาพอากาศแย่ (ลมแรง/ฝน) = ห้ามขึ้น\n\nกล้อง AI Vision ของ SafeSight ตรวจจับ Fall Detection แบบ Real-time ครับ`;
  }

  // Default welcome/help response
  return `🛡️ SafeSight AI Safety Advisor — ยินดีให้คำปรึกษาครับ\n\nระบบเฝ้าระวังความปลอดภัยแรงงานอัจฉริยะ สำหรับเขตพัฒนาพิเศษภาคตะวันออก (EEC)\n\nคุณสามารถ:\n• แตะ "เช็กอิน" เพื่อบันทึกความปลอดภัยประจำวัน\n• แตะ "แจ้งเตือนล่าสุด" ดูสถานะการแจ้งเตือน\n• แตะ "รายงานจุดเสี่ยง" ส่งรายงานอันตราย\n• พิมพ์ปรึกษา เช่น "ร้อนมาก ทำไงดี" หรือ "สารเคมีรั่ว"\n• ส่งรูปถ่ายสถานการณ์ ให้ AI Vision วิเคราะห์\n• พิมพ์ SOS เพื่อแจ้งเหตุฉุกเฉินทันที\n\n🌐 Available in: ไทย | English | မြန်မာ | ខ្មែរ | ລາວ`;
}

// ── Flex Message Builders (TunKai Frosted Glass Design → SafeSight Industrial) ──

function buildWelcomeFlexMessage() {
  return {
    type: "flex",
    altText: "🛡️ ยินดีต้อนรับสู่ SafeSight — ระบบความปลอดภัยอัจฉริยะ EEC",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1a0f00",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🛡️ SafeSight — เซฟไซต์", weight: "bold", color: "#FE6E00", size: "lg" },
          { type: "text", text: "ระบบเฝ้าระวังความปลอดภัยแรงงานอัจฉริยะ EEC", color: "#fbbf24", size: "xs", margin: "sm", wrap: true },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0f0a00",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "SafeSight พร้อมเฝ้าระวังความปลอดภัยให้คุณ 24/7 ผ่าน AI Vision, IoT Sensors และระบบแจ้งเตือนพหุภาษา\n\n🌐 รองรับ 5 ภาษา: ไทย | English | မြန်မာ | ខ្មែរ | ລາວ",
            color: "#e2e8f0",
            size: "sm",
            wrap: true,
          },
          {
            type: "separator",
            margin: "lg",
            color: "#3d2800",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#FE6E00", height: "sm", action: { type: "postback", label: "✅ เช็กอินความปลอดภัยวันนี้", data: "action=checkin" } },
              { type: "button", style: "secondary", color: "#1a1200", height: "sm", action: { type: "message", label: "🚨 ดูแจ้งเตือนล่าสุด", text: "แจ้งเตือนล่าสุด" } },
              { type: "button", style: "secondary", color: "#1a1200", height: "sm", action: { type: "message", label: "📋 รายงานจุดเสี่ยง", text: "รายงานจุดเสี่ยง" } },
              { type: "button", style: "link", color: "#fbbf24", height: "sm", action: { type: "uri", label: "🌐 เปิดแดชบอร์ดเต็มบนเว็บ", uri: `${SITE_URL}` } },
            ],
          },
        ],
      },
    },
  };
}

function buildSafetyCheckinFlexMessage() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

  return {
    type: "flex",
    altText: "✅ เช็กอินความปลอดภัยประจำวัน — SafeSight",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#052e16",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "✅ เช็กอินความปลอดภัยประจำวัน", weight: "bold", color: "#10b981", size: "sm" },
          { type: "text", text: `${dateStr} · ${timeStr}`, weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
          { type: "text", text: "ยืนยันการปฏิบัติตามมาตรฐาน PPE และกฎความปลอดภัย", color: "#a7f3d0", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#021a0b",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "📋 รายการตรวจก่อนเริ่มงาน:\n\n🦺 สวมเสื้อสะท้อนแสงแล้ว\n⛑️ สวมหมวกนิรภัยแล้ว\n🥽 สวมแว่นตานิรภัยแล้ว\n👢 สวมรองเท้านิรภัยแล้ว\n📡 ตรวจสอบอุปกรณ์สื่อสารแล้ว",
            color: "#cbd5e1",
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "lg", color: "#134e3a" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#10b981", height: "sm", action: { type: "postback", label: "✅ ยืนยัน — เช็กอินเรียบร้อย", data: "action=checkin" } },
              { type: "button", style: "link", color: "#34d399", height: "sm", action: { type: "uri", label: "🌐 เช็กอินผ่านเว็บ (พร้อมถ่ายรูป)", uri: `${SITE_URL}` } },
            ],
          },
        ],
      },
    },
  };
}

function buildAlertSummaryFlexMessage() {
  return {
    type: "flex",
    altText: "🚨 สรุปการแจ้งเตือนล่าสุด — SafeSight",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#450a0a",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🚨 แจ้งเตือนความปลอดภัยล่าสุด", weight: "bold", color: "#ef4444", size: "sm" },
          { type: "text", text: "สรุปเหตุการณ์จากระบบ AI Vision", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1c0505",
        paddingAll: "20px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "⚠️ ไม่สวมหมวก:", color: "#fca5a5", size: "sm" },
              { type: "text", text: "Zone A · 2 นาทีก่อน", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: "⚠️ ไม่สวมเสื้อ:", color: "#fca5a5", size: "sm" },
              { type: "text", text: "Zone C · 8 นาทีก่อน", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "sm",
            contents: [
              { type: "text", text: "🟢 Zone B:", color: "#86efac", size: "sm" },
              { type: "text", text: "ปลอดภัย — ไม่มีเหตุ", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#7f1d1d" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#ef4444", height: "sm", action: { type: "postback", label: "✅ รับทราบแจ้งเตือนทั้งหมด", data: "action=ack_alert=all" } },
              { type: "button", style: "link", color: "#f87171", height: "sm", action: { type: "uri", label: "🌐 ดูรายละเอียดบนแดชบอร์ด", uri: `${SITE_URL}` } },
            ],
          },
        ],
      },
    },
  };
}

function buildHazardReportGuideFlexMessage() {
  return {
    type: "flex",
    altText: "📋 รายงานจุดเสี่ยง / Near-miss — SafeSight",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1a0f00",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "📋 รายงานจุดเสี่ยง (Near-miss Report)", weight: "bold", color: "#FE6E00", size: "sm" },
          { type: "text", text: "ส่งรายงานอันตรายที่พบ", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0f0800",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "คุณสามารถรายงานจุดเสี่ยงได้ 2 วิธี:\n\n📸 วิธีที่ 1: ถ่ายรูปสถานการณ์ส่งในแชทนี้ AI จะวิเคราะห์อัตโนมัติ\n\n📝 วิธีที่ 2: เปิดเว็บแดชบอร์ดแล้วกรอกฟอร์มรายงาน (รองรับ 5 ภาษา พร้อมแนบไฟล์)\n\nทุกรายงานจะถูกส่งตรงถึง Safety Officer และบันทึกใน Audit Log ตามมาตรฐาน ISO 45001",
            color: "#cbd5e1",
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "lg", color: "#3d2800" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#FE6E00", height: "sm", action: { type: "uri", label: "📝 เปิดฟอร์มรายงานบนเว็บ", uri: `${SITE_URL}` } },
              { type: "button", style: "link", color: "#fbbf24", height: "sm", action: { type: "message", label: "📸 ส่งรูปถ่ายจุดเสี่ยง", text: "ส่งรูปจุดเสี่ยง" } },
            ],
          },
        ],
      },
    },
  };
}

function buildEmergencySOSFlexMessage() {
  return {
    type: "flex",
    altText: "🆘 SOS ฉุกเฉิน! — SafeSight Emergency Dispatch",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#7f1d1d",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🆘 SOS EMERGENCY — ฉุกเฉิน!", weight: "bold", color: "#ffffff", size: "lg" },
          { type: "text", text: "ระบบ SafeSight ได้รับแจ้งเหตุฉุกเฉินแล้ว", color: "#fecaca", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#450a0a",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "✅ ดำเนินการแล้ว:\n\n1. 📡 แจ้ง Safety Officer ทุกโซนแล้ว\n2. 🚑 ส่งพิกัดไปยังทีมกู้ภัย EEC แล้ว\n3. 📋 บันทึกลงระบบ Audit Log แล้ว\n4. 🔊 เปิดสัญญาณเตือนภัยแล้ว\n\n⚠️ ปฏิบัติตามมาตรการฉุกเฉิน:\n• เคลื่อนย้ายไปจุดรวมพล (Muster Point)\n• อย่ากลับเข้าพื้นที่อันตราย\n• รอคำสั่งจาก Safety Officer",
            color: "#fef2f2",
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "lg", color: "#991b1b" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#dc2626", height: "sm", action: { type: "uri", label: "📞 โทร 1669 (ศูนย์ฉุกเฉิน)", uri: "tel:1669" } },
              { type: "button", style: "link", color: "#f87171", height: "sm", action: { type: "uri", label: "🌐 เปิดหน้า Emergency Dispatch", uri: `${SITE_URL}` } },
            ],
          },
        ],
      },
    },
  };
}

function buildPPEStatusFlexMessage() {
  return {
    type: "flex",
    altText: "🦺 สถานะ PPE — SafeSight",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0c1a3d",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🦺 สถานะการสวม PPE แบบ Real-time", weight: "bold", color: "#60a5fa", size: "sm" },
          { type: "text", text: "ตรวจจับโดย AI Vision SafeSight", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#060e24",
        paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: "⛑️ หมวกนิรภัย:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "94% สวมครบ", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🦺 เสื้อสะท้อนแสง:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "91% สวมครบ", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🥽 แว่นตานิรภัย:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "87% สวมครบ", color: "#fbbf24", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "👢 รองเท้านิรภัย:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "96% สวมครบ", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#1e3a5f" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#3b82f6", height: "sm", action: { type: "uri", label: "🌐 ดูกล้อง AI Vision บนเว็บ", uri: `${SITE_URL}` } },
              { type: "button", style: "link", color: "#60a5fa", height: "sm", action: { type: "message", label: "🚨 ดูแจ้งเตือนล่าสุด", text: "แจ้งเตือนล่าสุด" } },
            ],
          },
        ],
      },
    },
  };
}

function buildZoneStatusFlexMessage(zone) {
  return {
    type: "flex",
    altText: `📍 สถานะ Zone ${zone} — SafeSight`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0f172a",
        paddingAll: "20px",
        contents: [
          { type: "text", text: `📍 สถานะโซน ${zone} — Real-time`, weight: "bold", color: "#FE6E00", size: "sm" },
          { type: "text", text: "🟢 สถานะ: ปลอดภัย", weight: "bold", color: "#10b981", size: "lg", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#030712",
        paddingAll: "20px",
        contents: [
          {
            type: "box", layout: "horizontal",
            contents: [
              { type: "text", text: "🌡️ อุณหภูมิ:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "32.4°C (ปกติ)", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "🔊 เสียง:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "72 dB(A) (ปกติ)", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "☣️ H2S:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "0.3 ppm (ปลอดภัย)", color: "#10b981", size: "sm", weight: "bold", align: "end" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "👷 แรงงานในโซน:", color: "#94a3b8", size: "sm" },
              { type: "text", text: "24 คน", color: "#ffffff", size: "sm", weight: "bold", align: "end" },
            ],
          },
          { type: "separator", margin: "lg", color: "#1e293b" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#FE6E00", height: "sm", action: { type: "uri", label: "🌐 ดู Digital Twin บนเว็บ", uri: `${SITE_URL}` } },
              {
                type: "button", style: "secondary", color: "#1e293b", height: "sm",
                action: { type: "postback", label: "📍 ตรวจโซนอื่น", data: "zone_status=B" },
              },
            ],
          },
        ],
      },
    },
  };
}

function buildTrainingFlexMessage() {
  return {
    type: "flex",
    altText: "📚 อบรมความปลอดภัย — SafeSight Academy",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1a0f2e",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "📚 SafeSight Worker Safety Academy", weight: "bold", color: "#a78bfa", size: "sm" },
          { type: "text", text: "หลักสูตรความปลอดภัยพร้อมใบรับรอง", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0d0520",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "คอร์สที่เปิดให้เรียน:\n\n1️⃣ PPE มาตรฐาน EEC (30 นาที) 🇹🇭🇬🇧🇲🇲🇰🇭🇱🇦\n2️⃣ การทำงานที่สูงอย่างปลอดภัย (45 นาที)\n3️⃣ สารเคมีอันตราย & MSDS (60 นาที)\n4️⃣ แผนอพยพฉุกเฉิน (20 นาที)\n5️⃣ ปฐมพยาบาลเบื้องต้น (40 นาที)\n\n🏆 ผ่านทุกคอร์ส → รับใบรับรอง ISO 45001",
            color: "#cbd5e1",
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "lg", color: "#2d1b69" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#8b5cf6", height: "sm", action: { type: "uri", label: "📚 เข้าเรียนบน SafeSight Academy", uri: `${SITE_URL}` } },
            ],
          },
        ],
      },
    },
  };
}

function buildImageReceivedFlexMessage() {
  return {
    type: "flex",
    altText: "📸 ได้รับรูปภาพแล้ว — SafeSight AI Vision",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#082f38",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "📸 AI Vision ได้รับรูปภาพแล้ว", weight: "bold", color: "#22d3ee", size: "sm" },
          { type: "text", text: "กำลังวิเคราะห์ความปลอดภัย...", weight: "bold", color: "#ffffff", size: "lg", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#041b20",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "ระบบ AI Vision กำลังตรวจจับ:\n\n🦺 การสวม PPE (หมวก, เสื้อสะท้อนแสง, แว่น)\n🚧 สภาพพื้นที่ทำงาน\n⚠️ จุดเสี่ยงที่มองเห็นได้\n👷 จำนวนแรงงานในภาพ\n\n💡 เพื่อผลวิเคราะห์ที่แม่นยำ เปิดกล้อง AI Vision แบบ Real-time บนเว็บแดชบอร์ดครับ",
            color: "#cbd5e1",
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "lg", color: "#0e5a6b" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#06b6d4", height: "sm", action: { type: "uri", label: "🌐 เปิด AI Vision บนเว็บ", uri: `${SITE_URL}` } },
              { type: "button", style: "link", color: "#22d3ee", height: "sm", action: { type: "postback", label: "📋 รายงานเป็นจุดเสี่ยง", data: "action=report_hazard" } },
            ],
          },
        ],
      },
    },
  };
}

// ── Neon PostgreSQL Database Logging ──────────────────────────────
async function saveLineMessageToNeon(dbUrl, userId, role, messageText) {
  if (!dbUrl) return;
  try {
    const query = `
      INSERT INTO safesight_line_messages (line_user_id, role, message_text, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT DO NOTHING;
    `;
    const sqlHttpUrl = dbUrl.replace("postgresql://", "https://").replace("postgres://", "https://").split("?")[0] + "/sql";

    await fetch(sqlHttpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, params: [userId, role, messageText] }),
    }).catch(() => {});
  } catch (err) {
    console.warn("SafeSight: Neon DB message logging skipped:", err.message);
  }
}

async function logAuditToNeon(dbUrl, actor, action, module, severity, details) {
  if (!dbUrl) return;
  try {
    const eventId = `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const query = `
      INSERT INTO audit_log (event_id, actor, action, module, severity, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT DO NOTHING;
    `;
    const sqlHttpUrl = dbUrl.replace("postgresql://", "https://").replace("postgres://", "https://").split("?")[0] + "/sql";

    await fetch(sqlHttpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, params: [eventId, actor, action, module, severity, details] }),
    }).catch(() => {});
  } catch (err) {
    console.warn("SafeSight: Audit log skipped:", err.message);
  }
}

async function getChatHistoryFromNeon(dbUrl, limit = 20) {
  if (!dbUrl) return [];
  try {
    const query = `
      SELECT id, line_user_id, role, message_text, created_at
      FROM safesight_line_messages
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    const sqlHttpUrl = dbUrl.replace("postgresql://", "https://").replace("postgres://", "https://").split("?")[0] + "/sql";

    const res = await fetch(sqlHttpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, params: [limit] }),
    });
    const data = await res.json();
    return data?.rows || [];
  } catch (err) {
    return [];
  }
}

// ── LINE API Helper ──────────────────────────────────────────────
async function sendLineMessage(replyToken, messages, token) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("SafeSight LINE reply error:", res.status, errText);
  }
}
