import "server-only";
import path from "node:path";
import { env, pipeline } from "@huggingface/transformers";
env.allowRemoteModels = false;
env.useFSCache = false;
env.localModelPath = path.join(process.cwd(), ".server-models/");
function createExtractor() {
  return pipeline("feature-extraction", "MiniLM", {
    dtype: "q8",
    device: "cpu",
    session_options: {
      intraOpNumThreads: 1,
      interOpNumThreads: 1,
      executionMode: "sequential"
    }
  });
}
let extractor: ReturnType<typeof createExtractor> | undefined;
export async function embedCategoryRuleTexts(
  texts: string[],
  deadline: number
): Promise<number[][]> {
  if (!extractor)
    extractor = createExtractor().catch((error) => {
      extractor = undefined;
      throw error;
    });
  const model = await extractor;
  const vectors: number[][] = [];
  for (let offset = 0; offset < texts.length; offset += 16) {
    if (Date.now() >= deadline)
      throw new Error("Category model time budget exceeded.");
    const output = await model(texts.slice(offset, offset + 16), {
      pooling: "mean",
      normalize: true
    });
    vectors.push(...(output.tolist() as number[][]));
  }
  return vectors;
}
