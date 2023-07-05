import express from "express";

import {
  CSP_VALUE,
  PLAYGROUND_UNSAFE_CSP_VALUE,
} from "../libs/constants/index.js";
import { STATIC_ROOT } from "../libs/env/index.js";
import { resolveFundamental } from "../libs/fundamental-redirects/index.js";
import { getLocale } from "../libs/locale-utils/index.js";
import { devMiddlewares } from "./dev.js";

// Lowercase every request because every possible file we might have
// on disk is always in lowercase. (pommicket: not fucking true, mdn)
// This only helps when you're on a filesystem (e.g. Linux) that is case
// sensitive.
const slugRewrite = (req, res, next) => {
  // pommicket:
  // mdn is wrong. the font files are not all lowercase.
  // neither is main.js.blablabla.LICENSE.txt
  // i guess they run windows on their servers? fucked up
  if (!req.url.endsWith(".woff2") && req.url.indexOf("LICENSE") === -1)
    req.url = req.url.toLowerCase();
  next();
};

/**
 * This function is returns an object with {url:string, status:number}
 * if there's some place to redirect to, otherwise an empty object.
 */
const originRequest = (req, res, next) => {
  const { url: fundamentalRedirectUrl, status } = resolveFundamental(req.url);
  if (fundamentalRedirectUrl && status) {
    res.redirect(status, fundamentalRedirectUrl);
  } else if (req.url === "/" || req.url.startsWith("/docs/")) {
    // Fake it so it becomes like Lambda@Edge
    req.headers.cookie = [
      {
        // The `req.cookies` comes from cookie-parser
        value: Object.entries(req.cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join(";"),
      },
    ];
    if (req.headers["accept-language"]) {
      // Lambda@Edge expects it to be an array of objects
      req.headers["accept-language"] = [
        { value: req.headers["accept-language"] },
      ];
    }
    const path = req.url.endsWith("/") ? req.url.slice(0, -1) : req.url;
    const locale = getLocale(req);
    // The only time we actually want a trailing slash is when the URL is just
    // the locale. E.g. `/en-US/` (not `/en-US`)
    res.redirect(302, `/${locale}${path || "/"}`);
  } else {
    next();
  }
};

export const staticMiddlewares = [
  ...devMiddlewares,
  slugRewrite,
  express.static(STATIC_ROOT, {
    setHeaders: (res) => {
      if (res.req.path.endsWith(".svg") || res.req.path.endsWith(".woff2")) {
        // pommicket: these resources don't change often
        res.setHeader("Cache-Control", "public, max-age=86400");
      } else if (res.req.path.endsWith("/runner.html")) {
        res.setHeader("Content-Security-Policy", PLAYGROUND_UNSAFE_CSP_VALUE);
      } else {
        res.setHeader("Content-Security-Policy", CSP_VALUE);
        // pommicket: default cache for 1hr
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  }),
];
export const originRequestMiddleware = originRequest;
