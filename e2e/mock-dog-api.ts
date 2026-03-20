const port = Number(process.env.MOCK_DOG_API_PORT ?? 3002);

console.log(`Mock Dog API listening on http://127.0.0.1:${port}`);

Bun.serve({
  port,
  fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (pathname === "/images/search") {
      return Response.json([
        {
          url: `https://images.example.test/${crypto.randomUUID()}.jpg`,
        },
      ]);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});
