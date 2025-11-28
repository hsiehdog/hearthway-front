"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expense, UploadedExpense, requestUploadUrl, completeUpload, fetchExpense } from "@/lib/api-client";

type Props = {
  groupId: string;
  onCreated?: (expense: Expense) => void;
  uploads?: UploadedExpense[];
};

export function UploadExpenseSection({ groupId, onCreated, uploads }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      onCreated?.(expense);
    },
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="expenseUpload">Upload receipt (PDF, doc, or image)</Label>
        <Input
          id="expenseUpload"
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
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
