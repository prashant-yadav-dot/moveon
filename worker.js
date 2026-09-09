export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes ko yahan handle kar sakte ho
    if (url.pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "MoveOn API is working"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Baaki website assets serve karo
    return env.ASSETS.fetch(request);
  }
};
