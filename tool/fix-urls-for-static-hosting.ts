import child_process, { spawnSync } from "node:child_process";
import fs from "node:fs";
import util from "node:util";

import { BUILD_OUT_ROOT } from "../libs/env/index.js";

export function runFixUrlsForStaticHosting(options) {
  const sourcePath = "./scripts/fix-urls-for-static-hosting.rs";
  const binPath = "./scripts/fix-urls-for-static-hosting";
  const sourceStat = fs.statSync(sourcePath);
  const binStat = fs.statSync(binPath);
  if (!binStat || sourceStat.mtimeMs > binStat.mtimeMs) {
    // recompile if executable doesn't exist or
    // source is more recent than executable
    spawnSync("rustc", [sourcePath, "-O", "-o", binPath], { stdio: "inherit" });
  }
  spawnSync(binPath, [BUILD_OUT_ROOT], { stdio: "inherit" });
}
