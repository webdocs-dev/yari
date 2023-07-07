import fs from "node:fs";
import path from "node:path";

import { fdir, PathsOutput } from "fdir";
import fm from "front-matter";

import { VALID_LOCALES } from "../libs/constants/index.js";
import { CONTENT_ROOT, CONTENT_TRANSLATED_ROOT } from "../libs/env/index.js";
import { SearchIndex } from "../build/index.js";
import { isValidLocale } from "../libs/locale-utils/index.js";

interface DocAttributes {
  title: string;
  locale: string;
  slug: string;
}

function getSearchIndex(localeLC) {
  const dir = localeLC === "en-us" ? CONTENT_ROOT : CONTENT_TRANSLATED_ROOT;
  if (!dir) return undefined;
  const searchIndex = new SearchIndex();
  const root = path.join(dir, localeLC);
  const locale = VALID_LOCALES.get(localeLC);
  const api = new fdir().withFullPaths().withErrors().crawl(root);
  for (const filePath of api.sync() as PathsOutput) {
    if (!(filePath.endsWith("index.html") || filePath.endsWith("index.md"))) {
      continue;
    }
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const { attributes: metadata } = fm<DocAttributes>(rawContent);
    metadata.locale = locale;

    const url = `/${locale}/docs/${metadata.slug}`;
    const doc = { metadata, url };
    searchIndex.add(doc);
  }
  return searchIndex;
}

function getSearchIndexes() {
  const map: Map<string, SearchIndex> = new Map();

  for (const locale of VALID_LOCALES.keys()) {
    const label = `Populate search-index for ${locale}`;
    console.time(label);
    const searchIndex = getSearchIndex(locale);
    if (searchIndex) {
      searchIndex.sort();
      map.set(locale, searchIndex);
    }
    console.timeEnd(label);
  }
  return map;
}

// building the search index can take some time,
// so we cache it. mdn/yari opts not to do this because
// if you're editing the site the cache can become stale.
const searchIndexes: Map<string, SearchIndex> = getSearchIndexes();

export async function searchIndexRoute(req, res) {
  // Remember, this is always in lowercase because of a middleware
  // that lowercases all incoming requests' pathname.
  const locale = req.params.locale;
  if (locale !== "en-us" && !CONTENT_TRANSLATED_ROOT) {
    res.status(500).send("CONTENT_TRANSLATE_ROOT not set\n");
    return;
  }
  const searchIndex = searchIndexes.get(locale);
  if (!searchIndex) {
    res.status(500).send(`unrecognized locale ${locale}`);
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(searchIndex.getItems()[locale]);
}
