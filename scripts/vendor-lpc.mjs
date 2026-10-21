// Only a small, pinned art subset is vendored. No generator application code is imported.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const revision = '9bf06be193b053db256b2536824af426de046aa2';
const repo = 'LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator';
const base = `https://raw.githubusercontent.com/${repo}/${revision}/`;
const definitions = {
  body: 'body/body.json',
  head: 'head/heads/human/heads_human_male.json',
  plain: 'hair/short/hair_plain.json',
  afro: 'hair/afro/hair_afro.json',
  bob: 'hair/bob/hair_bob.json',
  pants: 'legs/pants/legs_pants.json',
  longsleeve: 'torso/shirts/longsleeve/torso_clothes_longsleeve.json',
  shortsleeve: 'torso/shirts/shortsleeve/torso_clothes_shortsleeve.json',
};
const out = 'public/assets/lpc';
await fs.mkdir(out, { recursive: true });
async function get(path) {
  const r = await fetch(base + path);
  if (!r.ok) throw Error(`${path}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
const manifest = {
  revision,
  repository: `https://github.com/${repo}`,
  layers: {},
  palettes: {},
  credits: [],
  files: [],
};
for (const [id, definition] of Object.entries(definitions)) {
  const def = JSON.parse((await get(`sheet_definitions/${definition}`)).toString());
  const source = def.layer_1.male;
  const layer = { source, z: def.layer_1.zPos, animations: {} };
  for (const animation of ['walk', 'idle', 'sit']) {
    const sourcePath = `spritesheets/${source}${animation}.png`;
    const buffer = await get(sourcePath);
    const path = `${id}-${animation}.png`;
    await fs.writeFile(`${out}/${path}`, buffer);
    const meta = await sharp(buffer).metadata();
    if (meta.height !== 256 || meta.width % 64 !== 0)
      throw Error(`Unexpected frame grid: ${sourcePath}`);
    layer.animations[animation] = { path, frames: meta.width / 64 };
    manifest.files.push({
      path,
      source: sourcePath,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    });
  }
  manifest.layers[id] = layer;
  for (const credit of def.credits.filter((c) => source.startsWith(c.file))) {
    const license = credit.licenses.includes('CC-BY-SA 3.0')
      ? 'CC-BY-SA 3.0'
      : credit.licenses.includes('CC0')
        ? 'CC0'
        : null;
    if (!license) throw Error(`Review license before importing ${id}`);
    manifest.credits.push({ layer: id, ...credit, selectedLicense: license });
  }
  if (!manifest.credits.some((c) => c.layer === id)) throw Error(`Missing attribution: ${id}`);
}
for (const material of ['body', 'hair', 'eye', 'cloth'])
  manifest.palettes[material] = JSON.parse(
    (await get(`palette_definitions/${material}/${material}_ulpc.json`)).toString(),
  );
await fs.writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(
  `${out}/CREDITS.txt`,
  [
    'LPC character artwork / The Pomins',
    `Source: https://github.com/${repo}/tree/${revision}`,
    'Selected art licenses: CC-BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/) and CC0.',
    'Modifications: runtime palette recoloring and composition of selected layers; derivative art under CC-BY-SA 3.0.',
    'No endorsement by the original artists. Original PNG layers are distributed alongside this file.',
    ...manifest.credits.map(
      (c) =>
        `\n${c.layer} / ${c.file}\nAuthors: ${c.authors.join(', ')}\nLicense: ${c.selectedLicense}\n${c.notes}\n${c.urls.join('\n')}`,
    ),
  ].join('\n') + '\n',
);
console.log(`Vendored ${manifest.files.length} PNG layers at ${revision}`);
