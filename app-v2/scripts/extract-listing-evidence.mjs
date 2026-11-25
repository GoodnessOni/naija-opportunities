import { readFile } from "node:fs/promises";
import { extractListingEvidence } from "./sources/listing-evidence.mjs";

const [file] = process.argv.slice(2);
const { OPENAI_API_KEY: key, OPENAI_MODEL: model } = process.env;
if (!file || !key || !model) {
  console.error("Usage: set OPENAI_API_KEY and OPENAI_MODEL, then run node scripts/extract-listing-evidence.mjs <official-source.txt>");
  process.exit(1);
}

try {
  const source = await readFile(file, "utf8");
  const evidence = await extractListingEvidence(source, { key, model });
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
