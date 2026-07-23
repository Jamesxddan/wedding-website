#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const videosDir = path.join(__dirname, "..", "public", "videos");
const manifestPath = path.join(videosDir, "manifest.json");

const files = fs
  .readdirSync(videosDir)
  .filter((f) => /\.(mp4|webm|mov)$/i.test(f))
  .sort();

fs.writeFileSync(manifestPath, JSON.stringify(files, null, 2));
console.log(`[video-manifest] found ${files.length} video(s):`, files);
