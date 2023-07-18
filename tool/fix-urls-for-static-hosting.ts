import { spawnSync } from "node:child_process";
import fs from "node:fs";

import { BUILD_OUT_ROOT } from "../libs/env/index.js";

export function runFixUrlsForStaticHosting() {
  const sourcePath = "./scripts/fix-urls-for-static-hosting.rs";
  const binPath = "./scripts/fix-urls-for-static-hosting";
  const sourceStat = fs.statSync(sourcePath);
  const binStat = fs.statSync(binPath, { throwIfNoEntry: false });
  if (!binStat || sourceStat.mtimeMs > binStat.mtimeMs) {
    // recompile if executable doesn't exist or
    // source is more recent than executable
    spawnSync("rustc", [sourcePath, "-O", "-o", binPath], { stdio: "inherit" });
  }
  spawnSync(binPath, [BUILD_OUT_ROOT], { stdio: "inherit" });
}
