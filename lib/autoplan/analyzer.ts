// lib/autoplan/analyzer.ts — Claude Sonnet vision analysis for floor plans

import Anthropic from "@anthropic-ai/sdk";
import type { AutoplanBuilding, AIAnalysisResult } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "sk-ant-placeholder",
});

function buildPrompt(building: AutoplanBuilding): string {
  return `You are analyzing a floor plan PDF for a UK building to identify fire safety elements.

BUILDING CONTEXT:
- Name: ${building.name}
- Address: ${building.address_line_1}, ${building.city}, ${building.postcode}
- Jurisdiction: ${building.jurisdiction.toUpperCase()}
- Height: ${building.height_metres || "unknown"}m, ${building.number_of_storeys} storeys
- Use: ${building.building_use.replace(/_/g, " ")}
- Evacuation Strategy: ${building.evacuation_strategy.replace(/_/g, " ")}
- Sprinklers: ${building.has_sprinklers ? "Yes" : "No"}
- Dry Riser: ${building.has_dry_riser ? "Yes" : "No"}
- Wet Riser: ${building.has_wet_riser ? "Yes" : "No"}

Analyze this floor plan image and identify:

1. EXITS — doors leading outside or to protected escape routes
2. FIRE DOORS — doors with fire resistance markings (FD30, FD60, etc.) or likely fire doors based on position
3. STAIRCASES — protected stairways, firefighting stairs
4. FIRE EQUIPMENT — extinguishers, call points, hose reels if visible
5. CORRIDORS — common parts, escape routes
6. ROOMS — flats, offices, plant rooms (labels if visible)
7. SCALE — drawing scale if marked (e.g. "1:100")

For each element, provide its approximate position as normalised coordinates (0.0 to 1.0 relative to image width and height, where 0,0 is top-left).

Based on the building context and what you see, suggest appropriate fire safety symbols from this list:
- fire_exit, fire_exit_left, fire_exit_right (for exits)
- assembly_point (for assembly areas, typically outside)
- fire_extinguisher (near exits and corridors)
- fire_alarm_cp (call points near exits)
- fire_hose_reel (in corridors for buildings >18m)
- fire_door_fd30, fire_door_fd60 (for fire doors — FD30 for flat entrances, FD60 for stairwell doors in >18m buildings)
- smoke_detector, heat_detector (in corridors and rooms)
- sprinkler_head (only if building has sprinklers)
- emergency_light (along escape routes)
- dry_riser_inlet, wet_riser_outlet (only if building has risers)

Return ONLY valid JSON:
{
  "confidence": 0.85,
  "scale": "1:100",
  "elements": {
    "exits": [{ "x": 0.45, "y": 0.92, "type": "final_exit", "notes": "main entrance" }],
    "fire_doors": [{ "x": 0.3, "y": 0.5, "rating": "FD30", "notes": "flat entrance" }],
    "staircases": [{ "x": 0.1, "y": 0.5, "type": "protected", "notes": "core stairwell" }],
    "equipment": [{ "x": 0.2, "y": 0.4, "type": "fire_extinguisher" }],
    "corridors": [{ "x": 0.5, "y": 0.5, "width": 0.1, "height": 0.8, "notes": "main corridor" }],
    "rooms": [{ "x": 0.7, "y": 0.3, "label": "Flat 1A", "type": "flat" }]
  },
  "suggested_symbols": [
    { "symbolId": "fire_exit", "x": 0.45, "y": 0.92, "rotation": 0 },
    { "symbolId": "fire_door_fd30", "x": 0.3, "y": 0.5, "rotation": 0 },
    { "symbolId": "fire_extinguisher", "x": 0.2, "y": 0.4, "rotation": 0 }
  ],
  "warnings": ["Scale bar not found — positions approximate"],
  "regulatory_notes": [
    "Building >18m: Fire Safety (England) Regulations 2022 Regulation 6 requires floor plans"
  ]
}`;
}

export async function analyzeFloorPlan(
  pdfBase64: string,
  building: AutoplanBuilding
): Promise<AIAnalysisResult> {
  const prompt = buildPrompt(building);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonStr = textBlock.text.trim();
  // Extract JSON from potential markdown code fence
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude response");
  }

  const result = JSON.parse(jsonMatch[0]) as AIAnalysisResult;

  // Validate basic structure
  if (typeof result.confidence !== "number") result.confidence = 0;
  if (!result.elements) {
    result.elements = { exits: [], fire_doors: [], staircases: [], equipment: [], corridors: [], rooms: [] };
  }
  if (!result.suggested_symbols) result.suggested_symbols = [];
  if (!result.warnings) result.warnings = [];
  if (!result.regulatory_notes) result.regulatory_notes = [];

  return result;
}
