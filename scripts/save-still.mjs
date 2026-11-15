/*
  Takes a still of the stone from the page while developing and saves it next to this script's
  argument. Run: node scripts/save-still.mjs public/assets
  Then, with the dev server open in a browser, in its console: __stone.still()
  That draws the stone at 2400 pixels across and posts it here as still.png. See the README.
*/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? ".";
http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    if (req.method !== "POST") return res.writeHead(405).end();
    const name = path.basename(new URL(req.url, "http://x").searchParams.get("name") || "still.png");
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      fs.writeFileSync(path.join(out, name), Buffer.concat(chunks));
      console.log("saved", path.join(out, name));
      res.writeHead(200).end("ok");
    });
  })
  .listen(8791, "127.0.0.1", () => console.log("waiting on http://127.0.0.1:8791"));
