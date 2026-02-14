"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AvatarUploadProps {
  currentUrl: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
  width?: number;
  height?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AvatarUpload({
  currentUrl,
  displayName,
  onUploaded,
  width = 180,
  height = 220,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasImage = !!(currentUrl || preview);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      // @ts-ignore — CDN import resolved at runtime, not by webpack/tsc
      const bgLib = await import(/* webpackIgnore: true */ "https://esm.sh/@imgly/background-removal@1.5.1");
      const blob = await bgLib.removeBackground(file, {
        output: { format: "image/png", quality: 0.9 },
      });
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setProcessedBlob(blob);
    } catch (err) {
      console.error("Background removal failed, using original:", err);
      const url = URL.createObjectURL(file);
      setPreview(url);
      setProcessedBlob(file);
    }
    setProcessing(false);
  }, []);

  const handleConfirm = async () => {
    if (!processedBlob) return;
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    formData.append("avatar", processedBlob, "avatar.png");

    const res = await fetch("/api/avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (res.ok) {
      const { avatar_url } = await res.json();
      onUploaded(avatar_url);
      setPreview(null);
      setProcessedBlob(null);
    }
    setUploading(false);
  };

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setProcessedBlob(null);
  };

  const initials = getInitials(displayName);

  return (
    <div className="relative group" style={{ width, height }}>
      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div
        className="overflow-hidden flex items-end justify-center cursor-pointer"
        style={{
          width,
          height,
          borderRadius: hasImage ? "16px 16px 0 0" : 16,
          background: hasImage ? "transparent" : "linear-gradient(135deg, #0056a7, #0078d4)",
        }}
        onClick={() => !processing && !preview && fileRef.current?.click()}
      >
        {processing ? (
          <div className="flex items-center justify-center w-full h-full" style={{ background: "linear-gradient(135deg, #0056a7, #0078d4)" }}>
            <Loader2 className="w-10 h-10 animate-spin text-white" />
          </div>
        ) : preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover object-top" />
        ) : currentUrl ? (
          <img src={currentUrl} alt={displayName} className="w-full h-full object-cover object-top" />
        ) : (
          <span
            className="text-white text-5xl font-semibold flex items-center justify-center w-full h-full"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Camera overlay on hover */}
      {!preview && !processing && (
        <div
          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          style={{ borderRadius: hasImage ? "16px 16px 0 0" : 16 }}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="w-7 h-7 text-white" />
        </div>
      )}

      {/* Confirm/Cancel */}
      {preview && !uploading && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={handleConfirm}
            className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md hover:bg-green-600 transition"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="absolute top-2 right-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}
