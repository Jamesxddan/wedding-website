#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const videosDir = path.join(__dirname, "..", "public", "videos");
const manifestPath = path.join(videosDir, "manifest.json");

// Sort by file size ascending so the smallest video plays first on load.
// This means the page only needs to buffer ~3 MB for the initial autoplay
// instead of downloading the largest file upfront.
const files = fs
  .readdirSync(videosDir)
  .filter((f) => /\.(mp4|webm|mov)$/i.test(f))
  .map((f) => ({ name: f, size: fs.statSync(path.join(videosDir, f)).size }))
  .sort((a, b) => a.size - b.size)
  .map((f) => f.name);

fs.writeFileSync(manifestPath, JSON.stringify(files, null, 2));
console.log(`[video-manifest] found ${files.length} video(s):`, files);
files.forEach((f) => {
  const sz = fs.statSync(path.join(videosDir, f)).size;
  console.log(`  ${f}: ${(sz / 1024 / 1024).toFixed(1)} MB`);
});
