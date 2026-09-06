import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/dashboard", { recursive: true });
await cp("dashboard", "dist/dashboard", { recursive: true });
await cp("jobs.json", "dist/jobs.json");
await writeFile(
  "dist/index.html",
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./dashboard/"><title>hiremepls board</title><a href="./dashboard/">Open the job board</a>\n',
);
await writeFile("dist/.nojekyll", "");
console.log("Built static dashboard in dist/");
