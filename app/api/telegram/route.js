// app/api/telegram/route.js
// API Route นี้ทำงานฝั่ง server เท่านั้น
// Bot Token จะไม่ถูกส่งไปที่ browser ของผู้ใช้เลย

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(request) {
  try {
    // อ่านข้อความที่ส่งมาจากฝั่ง client (จาก app/sell/page.js)
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return Response.json(
        { success: false, error: "ไม่มีข้อความที่จะส่ง (text) " },
        { status: 400 }
      );
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID");
      return Response.json(
        { success: false, error: "Telegram config ไม่ครบ" },
        { status: 500 }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "HTML",
      }),
    });

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok) {
      console.error("ส่ง Telegram ไม่สำเร็จ:", telegramData);
      return Response.json(
        { success: false, error: telegramData.description || "ส่ง Telegram ไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("เกิดข้อผิดพลาดใน /api/telegram:", err);
    return Response.json(
      { success: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}
