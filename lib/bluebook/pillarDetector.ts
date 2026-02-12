const PILLAR_KEYWORDS: Record<string, string[]> = {
  fire_doors: ["fire door", "FD30", "FD60", "doorset", "ironmongery"],
  dampers: ["fire damper", "smoke damper", "HVAC", "ductwork"],
  fire_stopping: ["intumescent", "fire collar", "fire seal", "ablative", "penetration seal"],
  retro_fire_stopping: ["retrospective", "cavity barrier", "retrofit"],
  auro_lume: ["emergency lighting", "exit sign", "luminaire", "photoluminescent"],
};

/**
 * Auto-detect pillar from filename and/or content text.
 * Returns the best-matching pillar or null if no confident match.
 */
export function detectPillar(filename: string, content: string): string | null {
  const combined = `${filename} ${content}`.toLowerCase();

  let bestPillar: string | null = null;
  let bestScore = 0;

  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase(), "gi");
      const matches = combined.match(regex);
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPillar = pillar;
    }
  }

  return bestScore >= 1 ? bestPillar : null;
}
