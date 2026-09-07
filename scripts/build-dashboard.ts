import { mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/dashboard", { recursive: true });

for (const asset of ["index.html", "app.js", "model.js", "styles.css"]) {
  await Bun.write(`dist/dashboard/${asset}`, Bun.file(`dashboard/${asset}`));
}

await Bun.write("dist/jobs.json", Bun.file("jobs.json"));
await Bun.write(
  "dist/index.html",
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./dashboard/"><title>hiremepls board</title><a href="./dashboard/">Open the job board</a>\n',
);
await Bun.write("dist/.nojekyll", "");
console.log("Built static dashboard in dist/");
