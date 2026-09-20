// API Route ฝั่ง server สำหรับยิงข้อความเข้า Telegram
// เก็บ TELEGRAM_BOT_TOKEN ไว้ฝั่ง server เท่านั้น (ไม่ใช้ NEXT_PUBLIC_) เพื่อไม่ให้ token หลุดไปกับ client bundle

export async function POST(request) {
  try {
    const { text } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return Response.json(
        { ok: false, error: "ไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID" },
        { status: 500 }
      );
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await telegramRes.json();

    if (!data.ok) {
      return Response.json({ ok: false, error: data.description }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
