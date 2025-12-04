"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expense, UploadedExpense, requestUploadUrl, completeUpload, fetchExpense } from "@/lib/api-client";

type Props = {
  groupId: string;
  onCreated?: (expense: Expense) => void;
  onCancel?: () => void;
  autoOpenPicker?: boolean;
  uploads?: UploadedExpense[];
};

export function UploadExpenseSection({ groupId, onCreated, onCancel, autoOpenPicker, uploads }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const defaultInputRef = useRef<HTMLInputElement | null>(null);
  const mobileLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const smallScreen = window.matchMedia("(max-width: 1024px)").matches;
      setIsMobileOrTablet(coarsePointer || smallScreen);
    };

    updateIsMobile();

    const coarseMedia = window.matchMedia("(pointer: coarse)");
    const smallScreenMedia = window.matchMedia("(max-width: 1024px)");
    const addListener = (media: MediaQueryList) => {
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", updateIsMobile);
      } else if (typeof media.addListener === "function") {
        media.addListener(updateIsMobile);
      }
    };
    addListener(coarseMedia);
    addListener(smallScreenMedia);

    return () => {
      if (typeof coarseMedia.removeEventListener === "function") {
        coarseMedia.removeEventListener("change", updateIsMobile);
      } else if (typeof coarseMedia.removeListener === "function") {
        coarseMedia.removeListener(updateIsMobile);
      }
      if (typeof smallScreenMedia.removeEventListener === "function") {
        smallScreenMedia.removeEventListener("change", updateIsMobile);
      } else if (typeof smallScreenMedia.removeListener === "function") {
        smallScreenMedia.removeListener(updateIsMobile);
      }
    };
  }, []);

  const acceptTypes = isMobileOrTablet ? "image/*" : ".pdf,.doc,.docx,image/*";
  useEffect(() => {
    if (autoOpenPicker && isMobileOrTablet && !autoOpened && !file) {
      mobileLibraryInputRef.current?.click();
      setAutoOpened(true);
    }
  }, [autoOpenPicker, isMobileOrTablet, autoOpened, file]);
  useEffect(() => {
    if (!autoOpenPicker) {
      setAutoOpened(false);
    }
  }, [autoOpenPicker]);
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (isMobileOrTablet && !selected.type.startsWith("image/")) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selected));
    setFile(selected);
    setAutoOpened(false);
  };

  const resetSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFile(null);
    onCancel?.();
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("File is required");

      const presign = await requestUploadUrl(groupId, file.name, file.type || "application/octet-stream");
      const putResp = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResp.ok) {
        throw new Error("Failed to upload file");
      }
      await completeUpload(presign.upload.id);
      return fetchExpense(presign.expenseId);
    },
    onSuccess: async (expense) => {
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      onCreated?.(expense);
      onCancel?.();
    },
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="expenseUpload">
          Upload receipt {isMobileOrTablet ? "(images only on mobile)" : "(PDF, doc, or image)"}
        </Label>
        {isMobileOrTablet ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => mobileLibraryInputRef.current?.click()}
              >
                Choose photo
              </Button>
            </div>
            <input
              ref={mobileLibraryInputRef}
              id="expenseUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <Input
            ref={defaultInputRef}
            id="expenseUpload"
            type="file"
            accept={acceptTypes}
            capture={isMobileOrTablet ? "environment" : undefined}
            onChange={handleFileChange}
          />
        )}
        {file ? <p className="text-xs text-muted-foreground">Selected: {file.name}</p> : null}
        {previewUrl ? (
          <div className="overflow-hidden rounded-md border bg-muted/20">
            <img src={previewUrl} alt="Receipt preview" className="h-64 w-full object-contain" />
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={resetSelection} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          {uploadMutation.error ? (
            <p className="text-sm text-destructive">
              {(uploadMutation.error as Error).message || "Upload failed."}
            </p>
          ) : null}
          {uploadMutation.isSuccess ? (
            <p className="text-sm text-muted-foreground">Uploaded. Parsing to draft an expense.</p>
          ) : null}
        </div>
      </div>

      {uploads && uploads.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Existing uploads</p>
          <ul className="space-y-2">
            {uploads.map((upload, index) => (
              <li key={index} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{upload.originalFileName}</span>
                {upload.signedUrl || upload.fileUrl ? (
                  <a
                    href={upload.signedUrl ?? upload.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary underline"
                  >
                    View
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
