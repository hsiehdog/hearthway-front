"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Expense,
  UploadedExpense,
  payExpense,
  requestUploadUrl,
  completeUpload,
  fetchExpense,
} from "@/lib/api-client";

type Props = {
  groupId: string;
  members?: { id: string; userId: string | null; displayName: string }[];
  onCreated?: (expense: Expense) => void;
  onCancel?: () => void;
  autoOpenPicker?: boolean;
  uploads?: UploadedExpense[];
};

export function UploadExpenseSection({
  groupId,
  members = [],
  onCreated,
  onCancel,
  autoOpenPicker,
  uploads,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const defaultInputRef = useRef<HTMLInputElement | null>(null);
  const mobileLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "parsing" | "ready" | "error">(
    "idle"
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const progressForStatus = (currentStatus: typeof status) => {
    if (currentStatus === "uploading") return 30;
    if (currentStatus === "parsing") return 65;
    if (currentStatus === "ready") return 100;
    if (currentStatus === "error") return 100;
    return 0;
  };

  const statusLabel = () =>
    status === "uploading"
      ? "Uploading"
      : status === "parsing"
      ? "Parsing"
      : status === "ready"
      ? "Ready"
      : "Error";

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
    if (autoOpenPicker && isMobileOrTablet && !autoOpened && !file && status === "idle") {
      mobileLibraryInputRef.current?.click();
      setAutoOpened(true);
    }
  }, [autoOpenPicker, isMobileOrTablet, autoOpened, file, status]);
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
    setStatus("idle");
    setStatusMessage(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("File is required");
      setStatus("uploading");
      setStatusMessage(null);

      const presign = await requestUploadUrl(
        groupId,
        file.name,
        file.type || "application/octet-stream"
      );
      const putResp = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResp.ok) {
        throw new Error("Failed to upload file");
      }
      await completeUpload(presign.upload.id);
      setStatus("parsing");
      return presign.expenseId;
    },
    onSuccess: async (expenseId) => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      pollExpense(expenseId);
    },
    onError: (error: any) => {
      setStatus("error");
      setStatusMessage(error?.message || "Upload failed.");
    },
  });

  const pollExpense = async (expenseId: string, attempt = 0) => {
    try {
      const expense = await fetchExpense(expenseId);
      const uploadsList = expense.uploads ?? [];
      const parsingDone =
        uploadsList.length === 0 ||
        uploadsList.every(
          (u) => u.parsingStatus && ["SUCCESS", "FAILED"].includes(u.parsingStatus)
        );

      if (parsingDone) {
        setStatus("ready");
        setStatusMessage("Parsed. Opening expense…");
        const payerMemberId =
          members?.find((member) => member.userId && member.userId === session?.user?.id)?.id ??
          members?.find((member) => member.userId === null)?.id;
        if (payerMemberId) {
          try {
            await payExpense({
              expenseId: expense.id,
              amount: Number(expense.amount),
              payerMemberId,
              paidAt: new Date().toISOString(),
            });
            queryClient.invalidateQueries({ queryKey: ["group", groupId] });
          } catch (paymentError: any) {
            setStatus("error");
            setStatusMessage(paymentError?.message || "Could not record payment.");
            return;
          }
        }
        onCreated?.(expense);
        router.push(`/groups/${groupId}/expenses/${expense.id}`);
        return;
      }

      if (attempt >= 23) {
        setStatus("error");
        setStatusMessage("Parsing is taking longer than expected. Please try again.");
        return;
      }

      setStatus("parsing");
      setTimeout(() => pollExpense(expenseId, attempt + 1), 1500);
    } catch (error: any) {
      if (attempt >= 23) {
        setStatus("error");
        setStatusMessage(error?.message || "Could not load expense.");
        return;
      }
      setTimeout(() => pollExpense(expenseId, attempt + 1), 1500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {status === "idle" || status === "error" ? (
          isMobileOrTablet ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="w-full"
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
          )
        ) : null}
        {file ? (
          <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
        ) : null}
        {previewUrl ? (
          <div className="overflow-hidden rounded-md border bg-muted/20">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="h-64 w-full object-contain"
            />
          </div>
        ) : null}
        {status === "idle" || status === "error" ? (
          <div className="flex items-center gap-3 justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending || status === "parsing"}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetSelection}
              disabled={uploadMutation.isPending || status === "parsing"}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>

      {status !== "idle" ? (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Status</span>
            <span
              className={`flex items-center gap-2 font-medium ${
                status === "error" ? "text-destructive" : "text-foreground"
              }`}
            >
              {(status === "uploading" || status === "parsing") && (
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              <span>{statusLabel()}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className={`h-2 rounded-full transition-all ${
                status === "error" ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${progressForStatus(status)}%` }}
            />
          </div>
          {statusMessage ? (
            <p
              className={`text-xs ${
                status === "error" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {uploads && uploads.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Existing uploads
          </p>
          <ul className="space-y-2">
            {uploads.map((upload, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">
                  {upload.originalFileName}
                </span>
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
