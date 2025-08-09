// Vercel Serverless Function: /api/twitch-live
// Usage from client: /api/twitch-live?logins=rogueraven,cartha
// Env vars required in Vercel Project Settings:
//   TWITCH_CLIENT_ID
//   TWITCH_CLIENT_SECRET

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAppAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry - 60_000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token fetch failed: ${res.status} ${txt}`);
  }

  const data = await res.json(); // { access_token, expires_in, token_type }
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  try {
    const { logins } = req.query;
    if (!logins) return res.status(400).json({ error: "Missing ?logins=comma,separated" });

    const list = String(logins)
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (list.length === 0) return res.status(400).json({ error: "No valid logins provided" });

    const token = await getAppAccessToken();
    const qs = list.map(l => `user_login=${encodeURIComponent(l)}`).join("&");
    const url = `https://api.twitch.tv/helix/streams?${qs}`;

    const twitchRes = await fetch(url, {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!twitchRes.ok) {
      const txt = await twitchRes.text();
      return res.status(502).json({ error: `Twitch error: ${twitchRes.status}`, detail: txt });
    }

    const json = await twitchRes.json(); // { data: [...] }
    const live = {};
    for (const s of json.data || []) {
      if (s.type === "live" && s.user_login) {
        live[s.user_login.toLowerCase()] = {
          viewers: s.viewer_count,
          title: s.title,
          game_id: s.game_id,
          started_at: s.started_at,
        };
      }
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ live });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: String(e) });
  }
}
