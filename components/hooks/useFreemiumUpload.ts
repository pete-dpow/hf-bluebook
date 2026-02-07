"use client";

import { useState } from "react";

export function useFreemiumUpload() {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");

  // main upload handler
  const handleFreemiumUpload = async (file: File) => {
    try {
      setUploading(true);
      setFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);

      // call your freemium API route
      const res = await fetch("/api/upload-excel-freemium", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      // show preview
      setPreview(data.preview || []);

      // Save temporary session for Smart Save
      const pendingProject = {
        file, // actual File object, still available in memory
        fileName: file.name,
        projectName: file.name.replace(/\.[^/.]+$/, ""), // base name
        createdAt: Date.now(),
      };

      localStorage.setItem("pendingProject", JSON.stringify(pendingProject));

      console.log("✅ Freemium upload complete, pendingProject saved");
      return data;
    } catch (err: any) {
      console.error("❌ Freemium upload failed:", err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, preview, fileName, handleFreemiumUpload };
}
