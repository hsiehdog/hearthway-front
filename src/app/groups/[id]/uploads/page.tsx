"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateExpenseForm } from "@/components/groups/create-expense-form";
import { Expense, Group, fetchExpense, fetchGroup, uploadExpenseBatch } from "@/lib/api-client";

type UploadStatus = "queued" | "uploading" | "parsing" | "ready" | "error";

type UploadEntry = {
  id: string;
  fileName: string;
  status: UploadStatus;
  expenseId?: string;
  expense?: Expense;
  error?: string;
};

export default function UploadExpensesPage() {
  const params = useParams<{ id: string }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState<UploadEntry[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!groupId || selectedFiles.length === 0) {
        throw new Error("Pick at least one file");
      }
      setEntries(
        selectedFiles.map((file) => ({
          id: crypto.randomUUID(),
          fileName: file.name,
          status: "uploading",
        })),
      );
      return uploadExpenseBatch(groupId, selectedFiles);
    },
    onSuccess: async (result) => {
      setEntries((prev) =>
        result.expenseIds.map((expenseId, index) => ({
          ...(prev[index] ?? { id: crypto.randomUUID(), fileName: selectedFiles[index]?.name ?? `file-${index}` }),
          expenseId,
          status: "parsing",
        })),
      );

      result.expenseIds.forEach((expenseId, index) => {
        pollExpense(expenseId, index);
      });
    },
    onError: (err: any) => {
      setEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          status: "error",
          error: err?.message ?? "Upload failed",
        })),
      );
    },
  });

  const pollExpense = async (expenseId: string, entryIndex: number, attempt = 0) => {
    try {
      const expense = await fetchExpense(expenseId);
      const uploads = expense.uploads ?? [];
      const parsingDone =
        uploads.length === 0 ||
        uploads.every((u) => u.parsingStatus && ["SUCCESS", "FAILED"].includes(u.parsingStatus));

      if (parsingDone) {
        setEntries((prev) =>
          prev.map((entry, idx) =>
            idx === entryIndex
              ? {
                  ...entry,
                  expense,
                  status: "ready",
                }
              : entry,
          ),
        );
        return;
      }

      setEntries((prev) =>
        prev.map((entry, idx) => (idx === entryIndex ? { ...entry, status: "parsing" } : entry)),
      );
      setTimeout(() => pollExpense(expenseId, entryIndex, attempt + 1), 1500);
    } catch (error: any) {
      if (attempt > 3) {
        setEntries((prev) =>
          prev.map((entry, idx) =>
            idx === entryIndex
              ? { ...entry, status: "error", error: error?.message ?? "Could not load expense" }
              : entry,
            ),
        );
      }
      setTimeout(() => pollExpense(expenseId, entryIndex, attempt + 1), 1500);
    }
  };

  const progressForStatus = (status: UploadStatus) => {
    if (status === "uploading") return 25;
    if (status === "parsing") return 60;
    if (status === "ready") return 100;
    return 10;
  };

  const readyExpenses = useMemo(() => entries.filter((e) => e.status === "ready" && e.expense), [entries]);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Upload expenses</h1>
            <p className="text-sm text-muted-foreground">
              Group: {group?.name ?? "Loading..."} — Upload multiple receipts, let us parse them, then review and confirm
              each expense.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload files</CardTitle>
              <CardDescription>Drag in receipts or documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="files">Receipts</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                />
                {selectedFiles.length ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedFiles.map((file) => (
                      <li key={file.name} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                        <span className="text-foreground">{file.name}</span>
                        <span className="text-xs">
                          {file.type || "Unknown type"} · {Math.round(file.size / 1024)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !groupId || selectedFiles.length === 0}
                >
                  {mutation.isPending ? "Uploading..." : "Upload files"}
                </Button>
              </div>

              {entries.length ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Upload status</p>
                  <ul className="space-y-2">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{entry.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.status === "uploading"
                              ? "Uploading..."
                              : entry.status === "parsing"
                                ? "Parsing receipt..."
                                : entry.status === "ready"
                                  ? "Ready to review"
                                  : entry.error ?? "Queued"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[11px]">
                            {entry.status.toUpperCase()}
                          </Badge>
                          <div className="w-32 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${progressForStatus(entry.status)}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}

          {readyExpenses.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Review parsed expenses</CardTitle>
                <CardDescription>Edit and save each expense.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {readyExpenses.map((entry) =>
                  entry.expense ? (
                    <div key={entry.expense.id} className="rounded-lg border bg-muted/10 p-4">
                      <CreateExpenseForm
                        groupId={groupId}
                        members={group?.members ?? []}
                        initialExpense={entry.expense}
                        onSuccess={() => {
                          setEntries((prev) =>
                            prev.map((p) =>
                              p.id === entry.id ? { ...p, status: "ready", expense: entry.expense } : p,
                            ),
                          );
                        }}
                        asCard={false}
                      />
                    </div>
                  ) : null,
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
