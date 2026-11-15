/*
  Makes stand.webp, the photograph the page uses for the brass stand and the floor under it.
  Run with: node scripts/prepare-stand.mjs
*/
import sharp from "sharp";

await sharp("scripts/sources/01_meteorite_hero.png").removeAlpha().webp({ quality: 88 }).toFile("public/assets/stand.webp");
