import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.DASHBOARD_PORT || 4173);
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const routes: Record<string, string> = {
  "/": "dashboard/index.html",
  "/dashboard": "dashboard/index.html",
  "/dashboard/": "dashboard/index.html",
  "/dashboard/app.js": "dashboard/app.js",
  "/dashboard/model.js": "dashboard/model.js",
  "/dashboard/styles.css": "dashboard/styles.css",
  "/jobs.json": "jobs.json",
};

const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  const relativePath = routes[pathname];
  if (!relativePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const filePath = join(root, relativePath);
  try {
    const size = statSync(filePath).size;
    response.writeHead(200, {
      "Content-Length": size,
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": relativePath === "jobs.json" ? "no-store" : "public, max-age=60",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Could not read dashboard asset");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`hiremepls board: http://127.0.0.1:${port}/dashboard/`);
});
