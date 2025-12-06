"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Expense,
  Group,
  fetchExpense,
  fetchGroup,
  payExpense,
  uploadExpenseBatch,
} from "@/lib/api-client";
import { authClient } from "@/lib/auth/client";

type UploadStatus = "queued" | "uploading" | "parsing" | "ready" | "error";

type UploadEntry = {
  id: string;
  fileName: string;
  status: UploadStatus;
  expenseId?: string;
  expense?: Expense;
  error?: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

export default function UploadExpensesPage() {
  const params = useParams<{ id: string }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: session } = authClient.useSession();

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          ...(prev[index] ?? {
            id: crypto.randomUUID(),
            fileName: selectedFiles[index]?.name ?? `file-${index}`,
          }),
          expenseId,
          status: "parsing",
        })),
      );

      result.expenseIds.forEach((expenseId, index) => {
        pollExpense(expenseId, index);
      });
    },
    onError: (err: unknown) => {
      setEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          status: "error",
          error: getErrorMessage(err) || "Upload failed",
        })),
      );
    },
  });

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...next]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      addFiles(event.target.files);
      event.target.value = "";
    }
  };

  const pollExpense = async (
    expenseId: string,
    entryIndex: number,
    attempt = 0,
  ) => {
    try {
      let expense = await fetchExpense(expenseId);
      const uploads = expense.uploads ?? [];
      const parsingDone =
        uploads.length === 0 ||
        uploads.every(
          (u) =>
            u.parsingStatus && ["SUCCESS", "FAILED"].includes(u.parsingStatus),
        );

      if (parsingDone) {
        const payerMemberId =
          group?.members.find((member) => member.userId === session?.user?.id)
            ?.id ?? group?.members.find((member) => member.userId === null)?.id;

        if (payerMemberId) {
          try {
            await payExpense({
              expenseId,
              amount: Number(expense.amount),
              payerMemberId,
              paidAt: new Date().toISOString(),
            });
            expense = await fetchExpense(expenseId);
          } catch (paymentError: unknown) {
            setEntries((prev) =>
              prev.map((entry, idx) =>
                idx === entryIndex
                  ? {
                      ...entry,
                      status: "error",
                      error:
                        getErrorMessage(paymentError) ??
                        "Could not record payment",
                    }
                  : entry,
              ),
            );
            return;
          }
        }

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
        prev.map((entry, idx) =>
          idx === entryIndex ? { ...entry, status: "parsing" } : entry,
        ),
      );
      setTimeout(() => pollExpense(expenseId, entryIndex, attempt + 1), 1500);
    } catch (error: unknown) {
      if (attempt > 3) {
        setEntries((prev) =>
          prev.map((entry, idx) =>
            idx === entryIndex
              ? {
                  ...entry,
                  status: "error",
                  error: getErrorMessage(error) ?? "Could not load expense",
                }
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

  const readyExpenses = useMemo(
    () => entries.filter((e) => e.status === "ready" && e.expense),
    [entries],
  );

  const memberName = (memberId: string) =>
    group?.members.find((m) => m.id === memberId)?.displayName ?? memberId;

  const formatCurrency = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <Link
            href={`/groups/${groupId}`}
            className="group inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to {group?.name ?? "group"}</span>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Scan expenses</h1>
            <p className="text-sm text-muted-foreground">
              Upload receipts, let us parse them, then review and confirm each
              expense.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4">
              {entries.length === 0 ? (
                <div className="space-y-2">
                  <Label>Receipts</Label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/50 bg-muted/30 px-6 py-10 text-center transition hover:border-primary/60 hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <p className="text-sm font-medium text-foreground">
                      Drag and drop files here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDFs or images · up to 10MB each
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Choose files
                    </Button>
                    <input
                      ref={fileInputRef}
                      id="files"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFilePick}
                    />
                  </div>
                  {selectedFiles.length ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {selectedFiles.map((file, idx) => (
                        <li
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
                        >
                          <span className="text-foreground">{file.name}</span>
                          <span className="text-xs">
                            {file.type || "Unknown type"} ·{" "}
                            {Math.round(file.size / 1024)} KB
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {entries.length === 0 ? (
                <div className="flex justify-end">
                  <Button
                    onClick={() => mutation.mutate()}
                    disabled={
                      mutation.isPending ||
                      !groupId ||
                      selectedFiles.length === 0
                    }
                  >
                    {mutation.isPending ? "Uploading..." : "Upload files"}
                  </Button>
                </div>
              ) : null}

              {entries.length ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Upload status
                  </p>
                  <ul className="space-y-2">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {entry.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.status === "uploading"
                              ? "Uploading..."
                              : entry.status === "parsing"
                                ? "Parsing..."
                                : entry.status === "ready"
                                  ? "Ready to review"
                                  : (entry.error ?? "Queued")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[11px]">
                            {entry.status.toUpperCase()}
                          </Badge>
                          <div className="w-32 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{
                                width: `${progressForStatus(entry.status)}%`,
                              }}
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
                <CardTitle>Parsed expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {readyExpenses.map((entry) =>
                  entry.expense ? (
                    <Card
                      key={entry.expense.id}
                      className="border-muted bg-background"
                    >
                      <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                          <CardTitle className="text-xl font-semibold">
                            {entry.expense.name || "Expense"}
                          </CardTitle>
                          {entry.expense.description ? (
                            <CardDescription>
                              {entry.expense.description}
                            </CardDescription>
                          ) : null}
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            <Badge
                              variant={
                                entry.expense.status === "PAID"
                                  ? "default"
                                  : entry.expense.status === "REIMBURSED"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-[11px] font-medium"
                            >
                              {entry.expense.status?.toLowerCase() ?? "pending"}
                            </Badge>
                            <p className="text-xl font-semibold text-foreground">
                              {formatCurrency(
                                Number(entry.expense.amount),
                                entry.expense.currency,
                              )}
                            </p>
                          </div>
                          <CardDescription>
                            {new Date(entry.expense.date).toLocaleDateString(
                              "en-US",
                              {
                                timeZone: "UTC",
                              },
                            )}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">
                            Cost per participant ·{" "}
                            {entry.expense.splitType === "SHARES"
                              ? "Split by shares"
                              : entry.expense.splitType === "PERCENT"
                                ? "Split by percentage"
                                : "Split evenly"}
                          </p>
                          {entry.expense.participants.length ? (
                            <div className="overflow-hidden rounded-md border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2 text-left">
                                      Participant
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                      Cost
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.expense.participants.map((p) => (
                                    <tr key={p.id} className="border-t">
                                      <td className="px-3 py-2">
                                        <span className="text-foreground">
                                          {memberName(p.memberId)}
                                          {entry.expense.splitType ===
                                            "SHARES" && p.shareAmount
                                            ? ` (${p.shareAmount})`
                                            : ""}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {formatCurrency(
                                          Number(
                                            entry.expense.participantCosts?.[
                                              p.memberId
                                            ] ??
                                              p.shareAmount ??
                                              0,
                                          ),
                                          entry.expense.currency,
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No participants.
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">
                              Payments
                            </p>
                          </div>
                          {entry.expense.payments &&
                          entry.expense.payments.length ? (
                            <div className="overflow-hidden rounded-md border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2 text-left">
                                      Payer
                                    </th>
                                    <th className="px-3 py-2 text-left">
                                      Date
                                    </th>
                                    <th className="px-3 py-2 text-left">
                                      Notes
                                    </th>
                                    <th className="px-3 py-2 text-left">
                                      Amount
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.expense.payments.map((payment) => (
                                    <tr key={payment.id} className="border-t">
                                      <td className="px-3 py-2">
                                        {memberName(payment.payerId)}
                                      </td>
                                      <td className="px-3 py-2">
                                        {payment.paidAt
                                          ? new Date(
                                              payment.paidAt,
                                            ).toLocaleDateString("en-US", {
                                              timeZone: "UTC",
                                            })
                                          : "Unspecified"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {payment.notes || "—"}
                                      </td>
                                      <td className="px-2 py-2">
                                        {formatCurrency(
                                          Number(payment.amount),
                                          payment.currency,
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t bg-muted/50">
                                  <tr>
                                    <td className="px-3 py-2 text-left font-semibold">
                                      Total
                                    </td>
                                    <td className="px-3 py-2 text-left"></td>
                                    <td className="px-3 py-2 text-left"></td>
                                    <td className="px-2 py-2 font-semibold">
                                      {formatCurrency(
                                        (entry.expense.payments ?? []).reduce(
                                          (sum, p) =>
                                            sum + Number(p.amount || 0),
                                          0,
                                        ),
                                        entry.expense.currency,
                                      )}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No payments recorded.
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Link
                            href={`/groups/${groupId}/expenses/${entry.expense.id}`}
                            className="text-sm font-medium text-primary underline underline-offset-4"
                          >
                            View/edit expense
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
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
