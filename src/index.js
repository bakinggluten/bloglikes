export default {
  async fetch(request, env, ctx) {
    const { DB } = env;
    const urlObj = new URL(request.url);
    const searchParams = urlObj.searchParams;
    const url = searchParams.get("url");
    const addLikes = parseInt(searchParams.get("likes") || "0", 10);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    };

    // 日志
    const nowStr = new Date().toISOString();
    const requestIP =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const logObj = {
      time: nowStr,
      url: request.url,
      method: request.method,
      ip: requestIP,
      ua: userAgent
    };
    console.log("Request Log:", JSON.stringify(logObj));

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing url param" }), { status: 400, headers: corsHeaders });
    }

    let result = await DB.prepare("SELECT likes FROM likes WHERE url = ?").bind(url).first();
    let likes = result?.likes ? parseInt(result.likes) : 0;
    let hasRow = !!result;

    if (addLikes > 0) {
      if (hasRow) {
        likes += addLikes;
        await DB.prepare("UPDATE likes SET likes = ? WHERE url = ?").bind(likes, url).run();
      } else {
        likes = addLikes;
        await DB.prepare("INSERT INTO likes (url, likes) VALUES (?, ?)").bind(url, likes).run();
      }
    } else {
      if (!hasRow) {
        likes = 0;
        await DB.prepare("INSERT INTO likes (url, likes) VALUES (?, ?)")
          .bind(url, likes)
          .run();
      }
    }

    return new Response(JSON.stringify({ likes }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}