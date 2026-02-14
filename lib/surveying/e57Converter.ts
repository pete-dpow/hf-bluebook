/**
 * E57 → LAZ converter — wraps web-e57 for the Inngest processing pipeline.
 * Converts E57 point cloud files to LAZ format for downstream parsing.
 */

export async function convertE57ToLaz(e57Buffer: Buffer): Promise<Buffer> {
  // Dynamic import — web-e57 is a Node.js module used only on Inngest
  const { convertE57 } = await import("web-e57");

  const result = await convertE57(e57Buffer, "laz");

  if (!result || result.length === 0) {
    throw new Error("E57 conversion produced empty output");
  }

  return Buffer.from(result);
}
