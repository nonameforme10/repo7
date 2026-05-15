"use strict";

const compression = require("compression");
const express = require("express");
const fs = require("fs");
const next = require("next");
const path = require("path");

const rootDir = __dirname;
const hasProductionBuild = fs.existsSync(path.join(rootDir, ".next", "BUILD_ID"));
const dev = process.argv.includes("--dev") || (process.env.NODE_ENV !== "production" && !hasProductionBuild);
const hostname = process.env.HOSTNAME || "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

function noStoreHtml(res, filePath) {
  if (filePath.endsWith(".html")) {
    res.setHeader("Cache-Control", "no-store");
  }
}

nextApp.prepare().then(() => {
  const server = express();

  server.disable("x-powered-by");
  server.use(compression());

  server.get("/__caretrack_health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, app: "caretrack", via: "express" });
  });

  server.get("/index.html", (req, res) => nextApp.render(req, res, "/"));

  server.use("/assets/img", express.static(path.join(rootDir, "assets", "img"), {
    immutable: true,
    maxAge: "30d",
  }));

  server.use("/assets", express.static(path.join(rootDir, "assets"), {
    etag: true,
    maxAge: "1h",
  }));

  server.use("/admin", express.static(path.join(rootDir, "admin"), {
    etag: true,
    maxAge: 0,
    setHeaders: noStoreHtml,
  }));

  server.use("/auth", express.static(path.join(rootDir, "auth"), {
    etag: true,
    maxAge: 0,
    setHeaders: noStoreHtml,
  }));

  server.use("/sw.js", express.static(path.join(rootDir, "sw.js"), {
    etag: true,
    maxAge: 0,
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Service-Worker-Allowed", "/");
    },
  }));

  server.use((req, res) => handle(req, res));

  server.listen(port, hostname, () => {
    const mode = dev ? "development" : "production";
    console.log(`CareTrack ${mode} server ready at http://${hostname}:${port}`);
  });
});
