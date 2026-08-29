const DEFAULT_ORIGIN = "https://daichiand.github.io";

function corsHeaders(request, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function response(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

function validPoint(point) {
  return point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/route") return response({ error: "Not found" }, 404, headers);
    if (!env.ORS_API_KEY) return response({ error: "Route service is not configured" }, 503, headers);
    try {
      const { start, end } = await request.json();
      if (!validPoint(start) || !validPoint(end)) return response({ error: "Invalid start or end" }, 400, headers);
      const upstream = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: { Authorization: env.ORS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: [[Number(start.lng), Number(start.lat)], [Number(end.lng), Number(end.lat)]] })
      });
      if (!upstream.ok) return response({ error: "Route service is temporarily unavailable" }, 502, headers);
      const data = await upstream.json();
      const feature = data.features && data.features[0];
      if (!feature || !feature.geometry || !feature.properties || !feature.properties.summary) return response({ error: "No driving route found" }, 404, headers);
      return response({ geometry: feature.geometry, summary: feature.properties.summary }, 200, headers);
    } catch (_) {
      return response({ error: "Unable to create route" }, 400, headers);
    }
  }
};
