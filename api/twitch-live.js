// api/twitch-live.js
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  try {
    const { logins = "" } = req.query;
    const loginList = String(logins).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (loginList.length === 0) return res.status(200).json({ live: {} });

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Missing TWITCH_CLIENT_ID/SECRET env vars" });
    }

    // App access token
    const tokenResp = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: "POST" });
    const token = await tokenResp.json();
    if (!token?.access_token) {
      return res.status(500).json({ error: "Twitch auth failed" });
    }

    // Streams lookup
    const qs = loginList.map(l => `user_login=${encodeURIComponent(l)}`).join("&");
    const streamsResp = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, {
      headers: { "Client-ID": clientId, "Authorization": `Bearer ${token.access_token}` }
    });
    const data = await streamsResp.json();

    const liveMap = {};
    for (const s of data.data || []) {
      liveMap[(s.user_login || "").toLowerCase()] = {
        title: s.title || "",
        viewers: s.viewer_count || 0,
        gameId: s.game_id || ""
      };
    }

    res.status(200).json({ live: liveMap });
  } catch (e) {
    console.error("twitch-live error", e);
    res.status(500).json({ error: "Internal error" });
  }
}
