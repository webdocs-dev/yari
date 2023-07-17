import fs from "node:fs";
import { spawn } from "node:child_process";
import { VALID_LOCALES } from "../libs/constants/index.js";
import { BUILD_OUT_ROOT } from "../libs/env/index.js";

export async function runBuildPagefindIndex(options) {
  try {
    fs.accessSync(`${BUILD_OUT_ROOT}/index.html`, fs.constants.R_OK);
  } catch (e) {
    throw new Error(
      `${BUILD_OUT_ROOT}/index.html does not exist. Try running \`yarn build\` first.`
    );
  }

  let anyBuilt = false;
  const promises = [];
  for (const locale of VALID_LOCALES.keys()) {
    let built;
    try {
      fs.accessSync(`${BUILD_OUT_ROOT}/${locale}/docs`, fs.constants.R_OK);
      built = true;
    } catch (e) {
      built = false;
    }
    if (built) {
      anyBuilt = true;
      console.log(`Building index for ${locale}...`);
      const promise = new Promise((resolve, reject) => {
        spawn(
          "npx",
          [
            "-y",
            "pagefind",
            "--source",
            `${BUILD_OUT_ROOT}/${locale}/docs`,
            "--force-language",
            locale,
            "--bundle-dir",
            `${BUILD_OUT_ROOT}/static/js/pagefind/${locale}`,
          ],
          { stdio: "inherit" }
        ).on("exit", (code, signal) => {
          if (code === 0) {
            resolve(null);
          } else if (signal) {
            reject(`Process terminated with signal ${signal}`);
          } else {
            reject(`Process exited unsuccessfully (code ${code})`);
          }
        });
      });
      if (options.parallel) {
        promises.push(promise);
      } else {
        await promise;
      }
    }
  }

  // if options.parallel is false, this will be empty
  await Promise.all(promises);

  if (!anyBuilt) {
    throw new Error(
      "Couldn't find docs for any locale. Try running `yarn build` first."
    );
  }
}
