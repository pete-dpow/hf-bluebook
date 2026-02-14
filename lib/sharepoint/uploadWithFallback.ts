import { supabaseAdmin } from "@/lib/supabase";
import {
  isSharePointAvailable,
  uploadFile,
  uploadQuoteFile,
  uploadProductFile,
  uploadGoldenThreadFile,
  ensureFolderStructure,
} from "@/lib/sharepoint/client";

interface UploadOutcome {
  storage: "sharepoint" | "supabase";
  /** SharePoint item ID or Supabase storage path */
  path: string;
  /** SharePoint webUrl or Supabase public URL */
  url: string | null;
  /** SharePoint drive ID (null for supabase) */
  driveId: string | null;
  /** SharePoint item ID (null for supabase) */
  itemId: string | null;
}

// ─── Generic Upload With Fallback ──────────────────────────────

export async function uploadWithFallback(
  userId: string,
  organizationId: string,
  bucket: string,
  supabasePath: string,
  sharePointFolder: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadOutcome> {
  // Try SharePoint first
  const { available, driveId } = await isSharePointAvailable(userId, organizationId);

  if (available && driveId) {
    await ensureFolderStructure(userId, driveId);
    const result = await uploadFile(userId, driveId, sharePointFolder, fileName, content, contentType);

    if (result) {
      return {
        storage: "sharepoint",
        path: `${sharePointFolder}/${fileName}`,
        url: result.webUrl,
        driveId,
        itemId: result.id,
      };
    }
    // SharePoint failed — fall through to Supabase
  }

  // Fallback: Supabase Storage
  const fullPath = `${supabasePath}/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fullPath, content, { contentType, upsert: true });

  if (error) {
    throw new Error(`Both SharePoint and Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(fullPath);

  return {
    storage: "supabase",
    path: fullPath,
    url: urlData?.publicUrl || null,
    driveId: null,
    itemId: null,
  };
}

// ─── Typed Upload Helpers ──────────────────────────────────────

export async function uploadQuoteWithFallback(
  userId: string,
  organizationId: string,
  quoteNumber: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadOutcome> {
  return uploadWithFallback(
    userId,
    organizationId,
    "quote-files",
    `${organizationId}/quotes`,
    "hf.bluebook/Quotes",
    `${quoteNumber}-${fileName}`,
    content,
    contentType
  );
}

export async function uploadProductFileWithFallback(
  userId: string,
  organizationId: string,
  productId: string,
  manufacturerName: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadOutcome> {
  // For SharePoint, ensure manufacturer subfolder
  const { available, driveId } = await isSharePointAvailable(userId, organizationId);

  if (available && driveId) {
    const result = await uploadProductFile(userId, driveId, manufacturerName, fileName, content, contentType);
    if (result) {
      return {
        storage: "sharepoint",
        path: `hf.bluebook/Products/${manufacturerName}/${fileName}`,
        url: result.webUrl,
        driveId,
        itemId: result.id,
      };
    }
  }

  // Fallback: Supabase
  const supabasePath = `${organizationId}/${productId}/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from("product-files")
    .upload(supabasePath, content, { contentType, upsert: true });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("product-files")
    .getPublicUrl(supabasePath);

  return {
    storage: "supabase",
    path: supabasePath,
    url: urlData?.publicUrl || null,
    driveId: null,
    itemId: null,
  };
}

export async function uploadGoldenThreadWithFallback(
  userId: string,
  organizationId: string,
  packageRef: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadOutcome> {
  const { available, driveId } = await isSharePointAvailable(userId, organizationId);

  if (available && driveId) {
    const result = await uploadGoldenThreadFile(userId, driveId, packageRef, fileName, content, contentType);
    if (result) {
      return {
        storage: "sharepoint",
        path: `hf.bluebook/GoldenThread/${packageRef}/${fileName}`,
        url: result.webUrl,
        driveId,
        itemId: result.id,
      };
    }
  }

  // Fallback: Supabase
  const supabasePath = `${organizationId}/${packageRef}/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from("golden-thread")
    .upload(supabasePath, content, { contentType, upsert: true });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("golden-thread")
    .getPublicUrl(supabasePath);

  return {
    storage: "supabase",
    path: supabasePath,
    url: urlData?.publicUrl || null,
    driveId: null,
    itemId: null,
  };
}
