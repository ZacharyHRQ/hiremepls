const root = new URL("../", import.meta.url);
const port = Number(Bun.env.DASHBOARD_PORT || 4173);

const routes: Record<string, string> = {
  "/": "dashboard/index.html",
  "/dashboard": "dashboard/index.html",
  "/dashboard/": "dashboard/index.html",
  "/dashboard/app.js": "dashboard/app.js",
  "/dashboard/model.js": "dashboard/model.js",
  "/dashboard/styles.css": "dashboard/styles.css",
  "/jobs.json": "jobs.json",
};

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const relativePath = routes[pathname];
    if (!relativePath) return new Response("Not found", { status: 404 });

    const file = Bun.file(new URL(relativePath, root));
    if (!(await file.exists())) return new Response("Dashboard asset unavailable", { status: 500 });

    return new Response(file, {
      headers: {
        "Cache-Control": relativePath === "jobs.json" ? "no-store" : "public, max-age=60",
      },
    });
  },
});

console.log(`hiremepls board: http://127.0.0.1:${port}/dashboard/`);
