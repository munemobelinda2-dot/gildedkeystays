export async function handler(event) {
  const url = event.queryStringParameters.url;
  if (!url) return { statusCode: 400, body: "Missing ?url=" };
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Netlify-Function-ICS" }});
    if (!res.ok) return { statusCode: res.status, body: "Upstream error " + res.status };
    const text = await res.text();
    return { statusCode: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control":"public, max-age=300" }, body: text };
  } catch (err) { return { statusCode: 500, body: "Fetch error: " + err.message }; }
}
