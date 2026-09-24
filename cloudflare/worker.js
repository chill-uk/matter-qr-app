const DCL_ORIGIN = "https://on.dcl.csa-iot.org";
const DCL_PREFIX = "/api/dcl";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith(`${DCL_PREFIX}/`)) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" }
      });
    }

    const upstreamUrl = new URL(url);
    upstreamUrl.protocol = "https:";
    upstreamUrl.hostname = "on.dcl.csa-iot.org";
    upstreamUrl.port = "";
    upstreamUrl.pathname = url.pathname.replace(DCL_PREFIX, "/dcl");

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers: {
          Accept: request.headers.get("Accept") || "application/json"
        },
        redirect: "follow"
      });

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers
      });
    } catch {
      return Response.json(
        { error: "The CSA Distributed Compliance Ledger is unavailable." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
  }
};
