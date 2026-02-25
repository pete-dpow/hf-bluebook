/**
 * British Gypsum White Book — Static knowledge base.
 *
 * BG's Cloudflare protection blocks HTTP fetches, so when the sitemap-fetch
 * scraper falls back to URL-derived extraction we enrich the products with
 * known technical data from BG's publicly documented system specifications.
 *
 * URL pattern: /Specification/White-Book-Specification-Selector/{category}/{system}/{code}
 */

// ---------------------------------------------------------------------------
// System-level data (keyed by URL slug, e.g. "gypwall-single-frame")
// ---------------------------------------------------------------------------

export interface BgSystemInfo {
  displayName: string;
  systemType: string;
  description: string;
  fireRatingRange: string;
  typicalBoards: string;
  typicalFraming: string;
  testStandard: string;
  acousticRange?: string;
  heightRange?: string;
}

export const BG_SYSTEMS: Record<string, BgSystemInfo> = {
  // ── Internal Partitions ──
  "gypwall-single-frame": {
    displayName: "GypWall Single Frame",
    systemType: "Partition",
    description:
      "Single metal frame partition with plasterboard linings each side. Standard partition for internal walls.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine, Gyproc SoundBloc",
    typicalFraming: "GypFrame 'C' Studs 48/70mm @ 600mm c/c",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 40–55 dB",
    heightRange: "Up to 4800mm",
  },
  "gypwall-single-frame-enhanced": {
    displayName: "GypWall Single Frame Enhanced",
    systemType: "Partition",
    description:
      "Enhanced single frame partition with additional board layers for higher fire and acoustic performance.",
    fireRatingRange: "60–120 min",
    typicalBoards: "Gyproc FireLine, Gyproc SoundBloc, Gyproc Habito",
    typicalFraming: "GypFrame 'C' Studs 70mm @ 600mm c/c",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 50–62 dB",
    heightRange: "Up to 6000mm",
  },
  "gypwall-twin-frame-braced": {
    displayName: "GypWall Twin Frame Braced",
    systemType: "Partition",
    description:
      "Twin stud frames braced together for high-performance partitions requiring superior fire and acoustic ratings.",
    fireRatingRange: "60–120 min",
    typicalBoards: "Gyproc FireLine, Gyproc SoundBloc",
    typicalFraming: "2× GypFrame 'C' Studs braced at 1200mm intervals",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 55–67 dB",
    heightRange: "Up to 8000mm",
  },
  "gypwall-twin-frame-independent": {
    displayName: "GypWall Twin Frame Independent",
    systemType: "Partition",
    description:
      "Two independent stud frames with no mechanical connection for maximum acoustic separation.",
    fireRatingRange: "60–120 min",
    typicalBoards: "Gyproc FireLine, Gyproc SoundBloc",
    typicalFraming: "2× independent GypFrame 'C' Studs",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 60–72 dB",
    heightRange: "Up to 10000mm",
  },
  "gypwall-staggered": {
    displayName: "GypWall Staggered Stud",
    systemType: "Partition",
    description:
      "Staggered stud partition with studs offset on wider head and floor channels for improved acoustic performance.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine",
    typicalFraming: "GypFrame 'C' Studs staggered on 92mm channel",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 50–58 dB",
  },
  "gypwall-resilient": {
    displayName: "GypWall Resilient",
    systemType: "Partition",
    description:
      "Partition using resilient bars to decouple board from frame, providing enhanced acoustic isolation.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine, Gyproc SoundBloc",
    typicalFraming: "GypFrame 'C' Studs with GypFrame RB1 resilient bars",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 52–63 dB",
  },
  "gypwall-twin-frame-audio": {
    displayName: "GypWall Twin Frame Audio",
    systemType: "Partition",
    description:
      "Ultra-high acoustic performance twin frame system for music studios, cinemas and specialist applications.",
    fireRatingRange: "60–120 min",
    typicalBoards: "Gyproc SoundBloc, Gyproc FireLine",
    typicalFraming: "2× independent GypFrame 'C' Studs with acoustic isolation",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 68–78 dB",
  },
  "gypwall-classic": {
    displayName: "GypWall Classic",
    systemType: "Partition",
    description:
      "Standard lightweight partition system using metal framing and plasterboard.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine",
    typicalFraming: "GypFrame 'C' Studs 48/70mm @ 600mm c/c",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 40–50 dB",
  },
  "gypwall-robust": {
    displayName: "GypWall Robust",
    systemType: "Partition",
    description:
      "Robust partition system with pre-bonded plasterboard for faster installation and improved performance.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc DuraLine, Gyproc Habito",
    typicalFraming: "GypFrame 'C' Studs 70mm @ 600mm c/c",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw 45–55 dB",
  },

  // ── Shaft Walls ──
  "gypwall-shaft": {
    displayName: "GypWall Shaft",
    systemType: "Shaft Wall",
    description:
      "Shaft wall lining system for lift shafts, service risers and stairwells. Single-sided access construction using shaft liner board and metal framing.",
    fireRatingRange: "60–120 min",
    typicalBoards: "Gyproc ShaftLiner, Gyproc FireLine",
    typicalFraming: "GypFrame Shaft Wall 'I' Studs with 'J' track",
    testStandard: "BS EN 1364-1",
    heightRange: "Up to 9000mm",
  },

  // ── Wall Linings ──
  "gypliner-independent": {
    displayName: "GypLiner Independent",
    systemType: "Wall Lining",
    description:
      "Independent metal frame wall lining for upgrading existing walls. Free-standing frame with no fixings into the existing wall.",
    fireRatingRange: "30–120 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine, Gyproc SoundBloc",
    typicalFraming: "GypFrame 'C' Studs in floor/ceiling channels",
    testStandard: "BS EN 1364-1",
    acousticRange: "Rw improvement +10–25 dB",
  },
  "gypliner-gl": {
    displayName: "GypLiner GL",
    systemType: "Wall Lining",
    description:
      "Direct-bond and adhesive-fixed wall lining using dot-and-dab plasterboard application to masonry walls.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc ThermaLine",
    typicalFraming: "Gyproc Dri-Wall adhesive (dot and dab)",
    testStandard: "BS EN 1364-1",
  },
  "gypliner-mf": {
    displayName: "GypLiner MF",
    systemType: "Wall Lining",
    description:
      "Metal furring channel wall lining fixed to existing masonry or concrete walls for levelling and improved performance.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine",
    typicalFraming: "GypFrame MF5 furring channel @ 600mm c/c",
    testStandard: "BS EN 1364-1",
  },

  // ── Ceilings ──
  "gypline": {
    displayName: "GypLine Ceiling Lining",
    systemType: "Ceiling",
    description:
      "Suspended ceiling lining system using metal furring channels and plasterboard.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyproc WallBoard, Gyproc FireLine",
    typicalFraming: "GypFrame MF7 primary + MF5 secondary channels",
    testStandard: "BS EN 1365-2",
  },
  "gyproc-mf": {
    displayName: "Gyproc MF Ceiling",
    systemType: "Ceiling",
    description:
      "Metal frame suspended ceiling for new build and refurbishment with seamless plasterboard finish.",
    fireRatingRange: "30–120 min",
    typicalBoards: "Gyproc FireLine, Gyproc WallBoard",
    typicalFraming: "GypFrame MF7/MF5 grid system",
    testStandard: "BS EN 1365-2",
  },
  "gyptone-line": {
    displayName: "Gyptone Acoustic Ceiling",
    systemType: "Ceiling",
    description:
      "Perforated plasterboard ceiling tiles for acoustic absorption with seamless appearance.",
    fireRatingRange: "30–60 min",
    typicalBoards: "Gyptone perforated plasterboard",
    typicalFraming: "Concealed grid or MF channel system",
    testStandard: "BS EN 13964",
    acousticRange: "NRC 0.50–0.85",
  },

  // ── Steel Protection ──
  "firecase": {
    displayName: "Firecase Steel Encasement",
    systemType: "Steel Protection",
    description:
      "Lightweight fire protection encasement for structural steelwork using Glasroc F FireCase board.",
    fireRatingRange: "30–120 min",
    typicalBoards: "Glasroc F FireCase",
    typicalFraming: "Friction-fit or noggin-fixed board encasement",
    testStandard: "BS EN 13381-4",
  },

  // ── Horizontal Shaft Wall ──
  "gypwall-shaft-horizontal": {
    displayName: "GypWall Shaft Horizontal",
    systemType: "Horizontal Shaft Wall",
    description:
      "Horizontal shaft wall membrane for fire-rated enclosure of horizontal service voids and risers.",
    fireRatingRange: "60–120 min",
    typicalBoards: "Gyproc FireLine, Gyproc ShaftLiner",
    typicalFraming: "GypFrame channel and stud support grid",
    testStandard: "BS EN 1365-2",
  },
};

// ---------------------------------------------------------------------------
// Category-level data (keyed by URL slug, e.g. "shaftwall")
// ---------------------------------------------------------------------------

export interface BgCategoryInfo {
  displayName: string;
  description: string;
  pillar: string;
  typicalFireRatings: string;
}

export const BG_CATEGORIES: Record<string, BgCategoryInfo> = {
  "internal-partitions-walls": {
    displayName: "Internal Partitions & Walls",
    description:
      "Fire-rated and acoustic partition systems for internal wall construction using metal framing and plasterboard.",
    pillar: "fire_stopping",
    typicalFireRatings: "30, 60, 90, 120 minutes",
  },
  "shaftwall": {
    displayName: "Shaft Wall Systems",
    description:
      "Fire-rated shaft wall linings for lift shafts, service risers and stairwells with single-sided access construction.",
    pillar: "fire_stopping",
    typicalFireRatings: "60, 90, 120 minutes",
  },
  "wall-linings": {
    displayName: "Wall Linings",
    description:
      "Internal wall lining systems for upgrading existing walls — independent frame, direct bond and metal furring options.",
    pillar: "fire_stopping",
    typicalFireRatings: "30, 60, 120 minutes",
  },
  "steel-protection": {
    displayName: "Steel Protection",
    description:
      "Passive fire protection systems for structural steelwork using lightweight board encasement.",
    pillar: "fire_stopping",
    typicalFireRatings: "30, 60, 90, 120 minutes",
  },
  "horizontal-shaftwall": {
    displayName: "Horizontal Shaft Wall",
    description:
      "Horizontal fire-rated membranes for enclosure of service voids, horizontal risers and ceiling voids.",
    pillar: "fire_stopping",
    typicalFireRatings: "60, 120 minutes",
  },
  "ceilings": {
    displayName: "Ceilings",
    description:
      "Fire-rated and acoustic ceiling systems using suspended metal framing with plasterboard or perforated tiles.",
    pillar: "fire_stopping",
    typicalFireRatings: "30, 60, 120 minutes",
  },
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Find the best matching system info for a URL slug.
 * Tries exact match first, then prefix match (e.g. "gypwall-shaft" matches
 * any slug starting with "gypwall-shaft").
 */
export function lookupSystem(systemSlug: string): BgSystemInfo | null {
  const lower = systemSlug.toLowerCase();

  // Exact match
  if (BG_SYSTEMS[lower]) return BG_SYSTEMS[lower];

  // Prefix match (longest prefix wins)
  let bestMatch: BgSystemInfo | null = null;
  let bestLen = 0;
  for (const [key, info] of Object.entries(BG_SYSTEMS)) {
    if (lower.startsWith(key) && key.length > bestLen) {
      bestMatch = info;
      bestLen = key.length;
    }
  }

  return bestMatch;
}

export function lookupCategory(categorySlug: string): BgCategoryInfo | null {
  return BG_CATEGORIES[categorySlug.toLowerCase()] || null;
}
