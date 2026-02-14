/**
 * Inngest function: processSurveyScan
 * Full pipeline: E57→LAZ (if needed), parse LAS/LAZ, decimate, detect floors + walls.
 * All binary operations happen in a single step to avoid Inngest JSON serialization issues.
 */

import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const processSurveyScan = inngest.createFunction(
  { id: "process-survey-scan", concurrency: [{ limit: 2 }] },
  { event: "survey/scan.uploaded" },
  async ({ event, step }) => {
    const { scan_id } = event.data;

    // Get scan record
    const scan = await step.run("get-scan", async () => {
      const { data, error } = await supabaseAdmin
        .from("survey_scans")
        .select("*")
        .eq("id", scan_id)
        .single();
      if (error || !data) throw new Error("Scan not found");
      return data;
    });

    // Mark processing status
    await step.run("mark-processing", async () => {
      const status = scan.file_format === "e57" ? "converting" : "processing";
      await supabaseAdmin
        .from("survey_scans")
        .update({ processing_status: status })
        .eq("id", scan_id);
    });

    // All binary work in a single step (Buffer/Float32Array can't survive Inngest serialization)
    const result = await step.run("process-point-cloud", async () => {
      const { parseLasFile } = await import("@/lib/surveying/lasParser");
      const { decimatePointCloud, serializePointCloud } = await import("@/lib/surveying/decimator");
      const { detectFloors } = await import("@/lib/surveying/floorDetector");
      const { detectWalls } = await import("@/lib/surveying/wallDetector");

      // Download file
      const { data: fileData, error: dlError } = await supabaseAdmin.storage
        .from("survey-scans")
        .download(scan.storage_path);
      if (dlError || !fileData) throw new Error("Failed to download scan file");
      let rawBuffer = Buffer.from(await fileData.arrayBuffer());

      // E57 → LAZ conversion
      if (scan.file_format === "e57") {
        const { convertE57ToLaz } = await import("@/lib/surveying/e57Converter");
        rawBuffer = await convertE57ToLaz(rawBuffer);

        const lazPath = scan.storage_path.replace(/\.e57$/i, ".laz");
        await supabaseAdmin.storage
          .from("survey-scans")
          .upload(lazPath, rawBuffer, { contentType: "application/octet-stream", upsert: true });

        await supabaseAdmin
          .from("survey_scans")
          .update({ converted_storage_path: lazPath, processing_status: "processing" })
          .eq("id", scan_id);
      }

      // Parse point cloud
      const pointCloud = await parseLasFile(
        rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength)
      );

      // Update scan metadata
      await supabaseAdmin
        .from("survey_scans")
        .update({
          point_count: pointCloud.count,
          bounds_min: pointCloud.bounds.min,
          bounds_max: pointCloud.bounds.max,
        })
        .eq("id", scan_id);

      // Decimate for browser
      const decimated = decimatePointCloud(pointCloud);
      const binary = serializePointCloud(decimated);

      const decimatedPath = scan.storage_path.replace(/\.\w+$/, ".hfpc");
      await supabaseAdmin.storage
        .from("survey-scans")
        .upload(decimatedPath, binary, { contentType: "application/octet-stream", upsert: true });

      await supabaseAdmin
        .from("survey_scans")
        .update({ decimated_storage_path: decimatedPath, decimated_point_count: decimated.count })
        .eq("id", scan_id);

      // Detect floors
      const floors = detectFloors(pointCloud);

      if (floors.length > 0) {
        const floorRows = floors.map(f => ({
          scan_id,
          floor_label: f.label,
          z_height_m: f.z_height_m,
          z_range_min: f.z_range_min,
          z_range_max: f.z_range_max,
          point_count: f.point_count,
          confidence: f.confidence,
          sort_order: f.sort_order,
        }));

        const { error: floorError } = await supabaseAdmin.from("survey_floors").insert(floorRows);
        if (floorError) throw new Error(`Failed to store floors: ${floorError.message}`);
      }

      // Detect walls per floor
      const { data: storedFloors } = await supabaseAdmin
        .from("survey_floors")
        .select("id, z_height_m")
        .eq("scan_id", scan_id)
        .order("sort_order");

      let totalWalls = 0;
      for (const floor of storedFloors || []) {
        const walls = detectWalls(pointCloud, floor.z_height_m);
        if (walls.length > 0) {
          const wallRows = walls.map((w, idx) => ({
            floor_id: floor.id,
            wall_label: `Wall ${idx + 1}`,
            start_x: w.start_x,
            start_y: w.start_y,
            end_x: w.end_x,
            end_y: w.end_y,
            thickness_mm: w.thickness_mm,
            length_mm: w.length_mm,
            confidence: w.confidence,
          }));
          await supabaseAdmin.from("survey_walls").insert(wallRows);
          totalWalls += wallRows.length;
        }
      }

      return {
        point_count: pointCloud.count,
        decimated_count: decimated.count,
        floors_detected: floors.length,
        walls_detected: totalWalls,
      };
    });

    // Mark ready
    await step.run("mark-ready", async () => {
      await supabaseAdmin
        .from("survey_scans")
        .update({ processing_status: "ready", updated_at: new Date().toISOString() })
        .eq("id", scan_id);
    });

    return { scan_id, ...result };
  }
);
