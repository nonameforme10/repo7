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
const publicDir = path.join(rootDir, "public");

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

  server.use((_req, res, nextMiddleware) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://*.firebaseio.com",
        "script-src-elem 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://*.firebaseio.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://*.googleapis.com https://*.firebasestorage.app https://firebasestorage.googleapis.com",
        "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebaseio.com wss://*.firebasedatabase.app https://*.cloudfunctions.net https://*.firebaseapp.com https://*.firebasestorage.app https://firebasestorage.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
        "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://*.firebaseio.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ")
    );
    nextMiddleware();
  });

  server.get(["/__caretrack_health", "/_caretrack_health"], (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, app: "caretrack", via: "express" });
  });

  server.get("/favicon.ico", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=2592000");
    res.type("png").sendFile(path.join(publicDir, "assets", "img", "logo.png"));
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

  server.get("/robots.txt", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("text/plain").sendFile(path.join(rootDir, "robots.txt"));
  });

  server.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("application/xml").sendFile(path.join(rootDir, "sitemap.xml"));
  });

  server.use("/assets/img", express.static(path.join(publicDir, "assets", "img"), {
    etag: true,
    maxAge: 0,
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    },
  }));

  server.use("/assets", express.static(path.join(publicDir, "assets"), {
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
