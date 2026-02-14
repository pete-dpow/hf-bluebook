"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AvatarUploadProps {
  currentUrl: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
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

export default function AvatarUpload({ currentUrl, displayName, onUploaded }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      // Load @imgly/background-removal from CDN at runtime to avoid
      // webpack bundling issues with onnxruntime-web + Next.js 13.5
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
      // Fallback: use original image as-is
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
    <div className="relative group">
      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Avatar display */}
      <div
        className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm cursor-pointer flex items-center justify-center"
        style={{ background: currentUrl || preview ? "transparent" : "linear-gradient(135deg, #0056a7, #0078d4)" }}
        onClick={() => !processing && !preview && fileRef.current?.click()}
      >
        {processing ? (
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        ) : preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : currentUrl ? (
          <img src={currentUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span
            className="text-white text-xl font-semibold"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Camera overlay on hover (only when no preview) */}
      {!preview && !processing && (
        <div
          className="absolute inset-0 w-20 h-20 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Confirm/Cancel buttons when preview is showing */}
      {preview && !uploading && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <button
            onClick={handleConfirm}
            className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md hover:bg-green-600 transition"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancel}
            className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}
