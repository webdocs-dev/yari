import sharp from "sharp";

const ORGANIZATION = process.env.REACT_APP_ORGANIZATION || "MDN";
const ICONS = new Map([
  ["MDN", "src/assets/m-icon.svg"],
  ["webdocs.dev", "src/assets/webdocs-dev-icon.svg"],
]);

const icons = [
  { filename: "favicon.ico", resolution: 32 },
  { filename: "favicon-16x16.png", resolution: 16 },
  { filename: "favicon-32x32.png", resolution: 32 },
  { filename: "favicon-48x48.png", resolution: 48 },
  { filename: "favicon-64x64.png", resolution: 64 },
  { filename: "favicon-128x128.png", resolution: 128 },
  { filename: "favicon-150x150.png", resolution: 150 },
  { filename: "favicon-192x192.png", resolution: 192 },
  { filename: "favicon-512x512.png", resolution: 512 },
  { filename: "favicon-48x48-flawless.png", resolution: 48, tint: [0, 1, 0] },
  { filename: "favicon-48x48-flaws.png", resolution: 48, tint: [1, 0, 0] },
  {
    filename: "favicon-48x48-flaws-fixable.png",
    resolution: 48,
    tint: [1, 1, 0],
  },
];

export async function buildFavicons() {
  const svgPath = ICONS.get(ORGANIZATION);
  if (!svgPath) {
    throw new Error(`No favicon defined for organization ${ORGANIZATION}.`);
  }
  await Promise.all(
    icons.map((icon) =>
      sharp(svgPath)
        .resize(icon.resolution, icon.resolution)
        .linear(icon.tint || [1, 1, 1], [0, 0, 0])
        .toFile(`public/${icon.filename}`)
    )
  );
}
