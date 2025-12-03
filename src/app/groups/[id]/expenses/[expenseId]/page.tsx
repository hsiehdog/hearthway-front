"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  Expense,
  ExpensePayment,
  Group,
  deleteExpense,
  deleteExpensePayment,
  fetchExpense,
  fetchGroup,
  payExpense,
  updateExpensePayment,
} from "@/lib/api-client";
import { CreateExpenseForm } from "@/components/groups/create-expense-form";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string; expenseId: string }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const expenseId = Array.isArray(params.expenseId) ? params.expenseId[0] : params.expenseId;
  const queryClient = useQueryClient();

  const { data: group } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });

  const { data: expense, isPending, error } = useQuery<Expense>({
    queryKey: ["expense", expenseId],
    queryFn: () => fetchExpense(expenseId),
    enabled: Boolean(expenseId),
  });

  const memberName = (memberId: string) =>
    group?.members.find((m) => m.id === memberId)?.displayName ?? memberId;

  const paymentsTotal = useMemo(
    () => (expense?.payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [expense?.payments],
  );

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<ExpensePayment | null>(null);
  const deletePayment = useMutation({
    mutationFn: (paymentId: string) => deleteExpensePayment(expenseId, paymentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    },
  });

  return (
    <ProtectedRoute>
      <AppShell>
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !expense ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">Unable to load expense</CardTitle>
              <CardDescription className="text-destructive">
                {error instanceof Error ? error.message : "Please try again later."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <Link
              href={`/groups/${groupId}`}
              className="group inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to {group?.name ?? "group"}</span>
            </Link>
            <Card>
              <CardHeader className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-semibold">
                    {expense.name || "Expense"}
                  </CardTitle>
                  {expense.description ? (
                    <CardDescription>{expense.description}</CardDescription>
                  ) : null}
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <Badge
                      variant={
                        expense.status === "PAID"
                          ? "default"
                          : expense.status === "REIMBURSED"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[11px] font-medium"
                    >
                      {expense.status?.toLowerCase() ?? "pending"}
                    </Badge>
                    <p className="text-xl font-semibold text-foreground">
                      {formatCurrency(Number(expense.amount), expense.currency)}
                    </p>
                  </div>
                  <CardDescription>
                    {new Date(expense.date).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    Cost per participant ·{" "}
                    {expense.splitType === "SHARES"
                      ? "Split by shares"
                      : expense.splitType === "PERCENT"
                        ? "Split by percentage"
                        : "Split evenly"}
                  </p>
                  {expense.participants.length ? (
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Participant</th>
                            <th className="px-3 py-2 text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expense.participants.map((p) => (
                            <tr key={p.id} className="border-t">
                              <td className="px-3 py-2">
                                <span className="text-foreground">
                                  {memberName(p.memberId)}
                                  {expense.splitType === "SHARES" && p.shareAmount ? ` (${p.shareAmount})` : ""}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(
                                  Number(expense.participantCosts?.[p.memberId] ?? p.shareAmount ?? 0),
                                  expense.currency,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">None</p>
                  )}
                </div>
                {expense.lineItems.length ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Line items</p>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expense.lineItems.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-3 py-2">{item.description || "Item"}</td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(Number(item.totalAmount), expense.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    {expense.uploads && expense.uploads.length ? (
                      <a
                        href={expense.uploads[0].signedUrl ?? expense.uploads[0].fileUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        View upload
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      Add payment
                    </Button>
                    <Button size="sm" onClick={() => setShowEditExpense(true)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const confirmed = window.confirm("Delete this expense? This cannot be undone.");
                        if (!confirmed) return;
                        try {
                          await deleteExpense(expense.id);
                          await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
                          window.history.back();
                        } catch (err: any) {
                          alert(err?.message ?? "Could not delete expense");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payments</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPaymentToEdit(null);
                      setShowPaymentModal(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {expense.payments && expense.payments.length ? (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Payer</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Notes</th>
                          <th className="px-3 py-2 text-left">Amount</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expense.payments.map((payment) => (
                          <tr key={payment.id} className="border-t">
                            <td className="px-3 py-2">{memberName(payment.payerId)}</td>
                            <td className="px-3 py-2">
                              {payment.paidAt
                                ? new Date(payment.paidAt).toLocaleDateString("en-US", { timeZone: "UTC" })
                                : "Unspecified"}
                            </td>
                            <td className="px-3 py-2">{payment.notes || "—"}</td>
                            <td className="px-2 py-2">{formatCurrency(Number(payment.amount), payment.currency)}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setPaymentToEdit(payment);
                                    setShowPaymentModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => {
                                  const confirmed = window.confirm("Delete this payment? This cannot be undone.");
                                  if (confirmed) {
                                    deletePayment.mutate(payment.id);
                                  }
                                }}
                                disabled={deletePayment.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t bg-muted/50">
                        <tr>
                          <td className="px-3 py-2 text-left font-semibold">Total</td>
                          <td className="px-3 py-2 text-left"></td>
                          <td className="px-3 py-2 text-left"></td>
                          <td className="px-2 py-2 font-semibold">
                            {formatCurrency(paymentsTotal, expense.currency)}
                          </td>
                          <td className="px-2 py-2" colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                    {deletePayment.isError ? (
                      <p className="px-3 py-2 text-xs text-destructive">
                        {deletePayment.error instanceof Error
                          ? deletePayment.error.message
                          : "Could not delete payment"}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payments recorded.</p>
                )}
              </CardContent>
            </Card>

            <Dialog
              open={showPaymentModal}
              onClose={() => {
                setShowPaymentModal(false);
                setPaymentToEdit(null);
              }}
            >
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{paymentToEdit ? "Update payment" : "Add payment"}</CardTitle>
                  <CardDescription>
                    {paymentToEdit ? "Modify this payment record." : "Record a payment toward this expense."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddPaymentForm
                    expense={expense}
                    group={group}
                    payment={paymentToEdit ?? undefined}
                    onClose={() => {
                      setShowPaymentModal(false);
                      setPaymentToEdit(null);
                    }}
                    onSaved={async () => {
                      setShowPaymentModal(false);
                      setPaymentToEdit(null);
                    }}
                    submitLabel={paymentToEdit ? "Update payment" : "Add payment"}
                  />
                </CardContent>
              </Card>
            </Dialog>

            <Dialog open={showEditExpense} onClose={() => setShowEditExpense(false)}>
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Edit expense</CardTitle>
                  <CardDescription>Update details for this expense.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateExpenseForm
                    groupId={groupId}
                    members={group?.members ?? []}
                    initialExpense={expense}
                    asCard={false}
                    onSuccess={async () => {
                      await queryClient.invalidateQueries({ queryKey: ["expense", expense.id] });
                      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
                      setShowEditExpense(false);
                    }}
                  />
                </CardContent>
              </Card>
            </Dialog>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function AddPaymentForm({
  expense,
  group,
  onClose,
  onSaved,
  payment,
  submitLabel = "Add payment",
}: {
  expense: Expense;
  group?: Group;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  payment?: ExpensePayment;
  submitLabel?: string;
}) {
  const outstanding = Math.max(
    Number(expense.amount) -
      (expense.payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0),
    0,
  );
  const defaultPayer = payment
    ? payment.payerId
    : group?.members.find((m) => m.userId)?.id ?? group?.members[0]?.id ?? "";
  const [amount, setAmount] = useState(
    payment ? Number(payment.amount).toFixed(2) : outstanding ? outstanding.toFixed(2) : "",
  );
  const [payerId, setPayerId] = useState<string>(defaultPayer);
  const [paidAt, setPaidAt] = useState(() =>
    payment && payment.paidAt ? payment.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(payment?.notes ?? "");
  const [receiptUrl, setReceiptUrl] = useState(payment?.receiptUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (payment) {
      setAmount(Number(payment.amount).toFixed(2));
      setPayerId(payment.payerId);
      setPaidAt(payment.paidAt ? payment.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotes(payment.notes ?? "");
      setReceiptUrl(payment.receiptUrl ?? "");
    } else {
      setAmount(outstanding ? outstanding.toFixed(2) : "");
      setPayerId(defaultPayer);
      setPaidAt(new Date().toISOString().slice(0, 10));
      setNotes("");
      setReceiptUrl("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.id]);
  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!payerId) throw new Error("Select a payer");
      if (!amount || Number.isNaN(Number(amount))) throw new Error("Enter a valid amount");

      if (payment) {
        await updateExpensePayment({
          expenseId: expense.id,
          paymentId: payment.id,
          amount: Number(amount),
          payerMemberId: payerId,
          notes: notes || undefined,
          paidAt,
          receiptUrl: receiptUrl || undefined,
        });
      } else {
        await payExpense({
          expenseId: expense.id,
          amount: Number(amount),
          payerMemberId: payerId,
          notes: notes || undefined,
          paidAt,
          receiptUrl: receiptUrl || undefined,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense", expense.id] });
      await onSaved();
    },
    onError: (err: any) => {
      setError(err?.message ?? "Could not save payment");
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment-amount">Amount</Label>
          <Input
            id="payment-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-payer">Payer</Label>
          <select
            id="payment-payer"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select payer</option>
            {(group?.members ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-date">Paid at</Label>
          <Input
            id="payment-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-receipt">Receipt URL</Label>
          <Input
            id="payment-receipt"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="payment-notes">Notes</Label>
          <Input
            id="payment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
