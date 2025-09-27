// api/twitch-live.js
// Vercel Serverless Function: Twitch Live Status Proxy
//
// Requires environment variables set in Vercel dashboard:
// - TWITCH_CLIENT_ID
// - TWITCH_CLIENT_SECRET

let cachedToken = null;
let tokenExpiry = 0;

// Get an App Access Token from Twitch
async function getAppToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Twitch token: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000; // refresh slightly early
  return cachedToken;
}

export default async function handler(req, res) {
  try {
    const { logins } = req.query;
    if (!logins) {
      return res.status(400).json({ error: "Missing ?logins param" });
    }

    const loginArray = logins.split(",").map((s) => s.trim()).filter(Boolean);
    if (loginArray.length === 0) {
      return res.status(400).json({ error: "No valid logins provided" });
    }

    const token = await getAppToken();

    const apiRes = await fetch(
      `https://api.twitch.tv/helix/streams?${loginArray.map((l) => `user_login=${l}`).join("&")}`,
      {
        headers: {
          "Client-ID": process.env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!apiRes.ok) {
      throw new Error(`Twitch API error: ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const liveMap = {};

    (data.data || []).forEach((s) => {
      liveMap[s.user_login.toLowerCase()] = {
        title: s.title,
        viewers: s.viewer_count,
      };
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ live: liveMap });
  } catch (err) {
    console.error("Twitch proxy error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
