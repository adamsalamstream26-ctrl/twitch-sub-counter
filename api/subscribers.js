export const runtime = "nodejs";

export default async function handler(req, res) {
  // Allow the overlay to request the counter
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    TWITCH_REFRESH_TOKEN,
    TWITCH_BROADCASTER_ID
  } = process.env;

  if (
    !TWITCH_CLIENT_ID ||
    !TWITCH_CLIENT_SECRET ||
    !TWITCH_REFRESH_TOKEN ||
    !TWITCH_BROADCASTER_ID
  ) {
    return res.status(500).json({
      error: "Twitch environment variables are not configured"
    });
  }

  try {
    // Get a fresh Twitch user access token
    const tokenResponse = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          client_secret: TWITCH_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: TWITCH_REFRESH_TOKEN
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Twitch token error:", tokenData);

      return res.status(401).json({
        error: "Unable to refresh Twitch access token"
      });
    }

    const accessToken = tokenData.access_token;

    // Get subscriber count
    const subResponse = await fetch(
      `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${encodeURIComponent(
        TWITCH_BROADCASTER_ID
      )}`,
      {
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const subData = await subResponse.json();

    if (!subResponse.ok) {
      console.error("Twitch subscription error:", subData);

      return res.status(subResponse.status).json({
        error: "Unable to retrieve Twitch subscribers"
      });
    }

    return res.status(200).json({
      total: subData.total || 0
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}