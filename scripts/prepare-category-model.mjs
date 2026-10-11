import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const manifest = JSON.parse(
  await readFile(
    new URL("../lib/models/minilmManifest.json", import.meta.url),
    "utf8"
  )
);
const root = path.resolve(".server-models/MiniLM");
for (const [name, expected] of Object.entries(manifest.files)) {
  const target = path.join(root, name);
  let bytes = await readFile(target).catch(() => null);
  if (bytes && createHash("sha256").update(bytes).digest("hex") === expected)
    continue;
  const response = await fetch(
    `https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${name}`,
    { signal: AbortSignal.timeout(120000) }
  );
  if (!response.ok)
    throw new Error(
      `Model artifact download failed: ${name} (${response.status}).`
    );
  bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error(`Model checksum mismatch: ${name}.`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(`${target}.download`, bytes);
  await rename(`${target}.download`, target);
}
console.log("Pinned MiniLM artifacts verified.");
