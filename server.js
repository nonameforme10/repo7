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
const defaultApiOrigins = [
  "https://caretrack.website",
  "https://www.caretrack.website",
  "https://project-xbo8a.vercel.app",
  "http://localhost:3000",
  "http://localhost:4173",
];
const apiAllowedOrigins = new Set(
  (process.env.API_ALLOWED_ORIGINS || defaultApiOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

function apiCors(req, res, nextMiddleware) {
  const origin = req.get("Origin");
  if (origin && apiAllowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  nextMiddleware();
}

nextApp.prepare().then(() => {
  const server = express();

  server.disable("x-powered-by");
  server.use(compression());

  server.use("/api", apiCors);
  server.use("/api", express.json({ limit: "1mb" }));
  server.use("/api", express.urlencoded({ extended: false, limit: "1mb" }));

  server.get("/__caretrack_health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, app: "caretrack", via: "express" });
  });

  server.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      ok: true,
      app: "caretrack",
      service: "vps-api",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  server.post("/api/echo", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      ok: true,
      receivedAt: new Date().toISOString(),
      body: req.body || {},
      query: req.query || {},
    });
  });

  server.use("/api", (req, res) => {
    res.status(404).json({
      ok: false,
      error: "API route not found.",
      path: req.originalUrl,
    });
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
