"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Expense, Group, fetchExpense, fetchGroup } from "@/lib/api-client";
import { useMemo } from "react";

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
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Cost per participant ·{" "}
                    {expense.splitType === "SHARES"
                      ? "Split by shares"
                      : expense.splitType === "PERCENT"
                        ? "Split by percentage"
                        : "Split evenly"}
                  </p>
                  {expense.participants.length ? (
                    <ul className="space-y-1 text-muted-foreground">
                      {expense.participants.map((p) => (
                        <li key={p.id} className="flex items-center justify-between">
                          <span className="text-foreground">
                            {memberName(p.memberId)}
                            {expense.splitType === "SHARES" && p.shareAmount ? ` (${p.shareAmount})` : ""}
                          </span>
                          <span>
                            {formatCurrency(
                              Number(expense.participantCosts?.[p.memberId] ?? p.shareAmount ?? 0),
                              expense.currency,
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">None</p>
                  )}
                </div>
                {expense.lineItems.length ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Line items</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {expense.lineItems.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.description || "Item"}</span>
                          <span>{formatCurrency(Number(item.totalAmount), expense.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
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
                                <Button size="sm" variant="outline">
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => {
                                    const confirmed = window.confirm("Delete this payment? This cannot be undone.");
                                    if (confirmed) {
                                      // Hook up delete later
                                    }
                                  }}
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
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payments recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
