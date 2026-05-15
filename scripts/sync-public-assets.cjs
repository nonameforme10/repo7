"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const sourceAssetsDir = path.join(rootDir, "assets");
const publicAssetsDir = path.join(publicDir, "assets");
const sourceServiceWorker = path.join(rootDir, "sw.js");
const publicServiceWorker = path.join(publicDir, "sw.js");

function assertInside(target, parent) {
  const relative = path.relative(parent, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${parent}: ${target}`);
  }
}

function requirePath(target) {
  if (!fs.existsSync(target)) {
    throw new Error(`Required path does not exist: ${target}`);
  }
}

requirePath(sourceAssetsDir);
requirePath(sourceServiceWorker);
assertInside(publicAssetsDir, publicDir);
assertInside(publicServiceWorker, publicDir);

fs.mkdirSync(publicDir, { recursive: true });
fs.rmSync(publicAssetsDir, { recursive: true, force: true });
fs.cpSync(sourceAssetsDir, publicAssetsDir, { recursive: true });
fs.copyFileSync(sourceServiceWorker, publicServiceWorker);

console.log("Synced assets/ and sw.js into public/ for Next/Vercel.");
