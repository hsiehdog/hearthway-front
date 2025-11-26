"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { CreateExpenseForm } from "@/components/groups/create-expense-form";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Expense,
  Group,
  deleteExpense,
  fetchExpense,
  fetchGroup,
  payExpense,
} from "@/lib/api-client";
import { UploadExpenseSection } from "@/components/groups/upload-expense-section";

function formatAmount(expense: Expense) {
  const value = Number(expense.amount);
  if (Number.isNaN(value)) return `${expense.amount} ${expense.currency}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: expense.currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

type GroupWithHandlers = Group & {
  _toggleAddMember?: () => void;
  _toggleAddExpense?: () => void;
  _toggleUpload?: () => void;
  _actionsSlot?: React.ReactNode;
};

function PaymentsSection({
  expense,
  members,
  onPayment,
}: {
  expense: Expense;
  members: Group["members"];
  onPayment: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState<string>(members[0]?.id ?? "");
  const [paidAt, setPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!payerId) {
        throw new Error("Select a payer");
      }
      if (!amount || Number.isNaN(Number(amount))) {
        throw new Error("Enter a valid amount");
      }
      await payExpense({
        expenseId: expense.id,
        amount: Number(amount),
        payerMemberId: payerId,
        notes: notes || undefined,
        paidAt,
      });
    },
    onSuccess: async () => {
      setAmount("");
      setNotes("");
      await onPayment();
    },
    onError: (err: any) => {
      setError(err?.message ?? "Could not add payment");
    },
  });

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Payments</p>
        <Badge variant="secondary" className="text-xs">
          {expense.payments?.length ?? 0} recorded
        </Badge>
      </div>
      {expense.payments && expense.payments.length ? (
        <ul className="space-y-2 text-sm">
          {expense.payments.map((payment) => {
            const payerName =
              members.find((m) => m.id === payment.payerId)?.displayName ??
              "Unknown";
            return (
              <li
                key={payment.id}
                className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {payerName} ·{" "}
                    {formatAmount({ ...expense, amount: payment.amount })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.paidAt
                      ? new Date(payment.paidAt).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                        })
                      : "Unspecified date"}
                    {payment.notes ? ` · ${payment.notes}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paymentAmount">Amount</Label>
          <Input
            id="paymentAmount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentPayer">Payer</Label>
          <select
            id="paymentPayer"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentDate">Paid at</Label>
          <Input
            id="paymentDate"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentNotes">Notes</Label>
          <Input
            id="paymentNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending || !amount}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving..." : "Add payment"}
        </Button>
      </div>
    </div>
  );
}

function GroupCostsCard({ group }: { group: Group }) {
  const summary = useMemo(() => {
    const currency = group.expenses[0]?.currency || "USD";
    const total = group.expenses.reduce((sum, expense) => {
      const amount = Number(expense.amount);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);

    const perParticipant = group.expenses.reduce<Record<string, number>>(
      (acc, expense) => {
        if (!expense.participantCosts) return acc;
        Object.entries(expense.participantCosts).forEach(
          ([memberId, value]) => {
            const numeric = Number(value);
            if (Number.isNaN(numeric)) return;
            acc[memberId] = (acc[memberId] ?? 0) + numeric;
          }
        );
        return acc;
      },
      {}
    );

    const entries = Object.entries(perParticipant).map(
      ([memberId, amount]) => ({
        memberId,
        amount,
      })
    );

    return { currency, total, entries };
  }, [group.expenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary.currency,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Costs</CardTitle>
          <p className="text-2xl font-semibold text-foreground">
            {formatCurrency(summary.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            Based on {group.expenses.length} expense
            {group.expenses.length === 1 ? "" : "s"}.
          </p>
        </div>
        {summary.entries.length ? (
          <div className="w-full rounded-md border bg-muted/20 px-4 py-3 sm:w-[22rem] sm:ml-auto sm:self-end">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cost per participant
            </p>
            <ul className="mt-2 space-y-1">
              {summary.entries
                .sort((a, b) => b.amount - a.amount)
                .map(({ memberId, amount }) => {
                  const name =
                    group.members.find((m) => m.id === memberId)?.displayName ??
                    memberId;
                  return (
                    <li
                      key={memberId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{name}</span>
                      <span className="font-medium">
                        {formatCurrency(amount)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {summary.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No participant costs yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PaymentsCard({ group }: { group: Group }) {
  const summary = useMemo(() => {
    const currency = group.expenses[0]?.currency || "USD";
    const paidByMember = group.expenses.reduce<Record<string, number>>(
      (acc, expense) => {
        (expense.payments ?? []).forEach((payment) => {
          const amount = Number(payment.amount);
          if (Number.isNaN(amount)) return;
          acc[payment.payerId] = (acc[payment.payerId] ?? 0) + amount;
        });
        return acc;
      },
      {}
    );

    const paidTotal = Object.values(paidByMember).reduce(
      (sum, val) => sum + val,
      0
    );
    const unpaidTotal = group.expenses.reduce((sum, expense) => {
      const paid = (expense.payments ?? []).reduce(
        (sub, payment) => sub + Number(payment.amount || 0),
        0
      );
      const remaining = Number(expense.amount) - paid;
      return sum + (Number.isNaN(remaining) ? 0 : Math.max(remaining, 0));
    }, 0);

    const entries = Object.entries(paidByMember).map(([memberId, amount]) => ({
      memberId,
      amount,
    }));

    return { currency, entries, unpaidTotal, paidTotal };
  }, [group.expenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary.currency,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Payments</CardTitle>
          <p className="text-2xl font-semibold text-foreground">
            {formatCurrency(summary.paidTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            Unpaid total: {formatCurrency(summary.unpaidTotal)}
          </p>
        </div>
        {summary.entries.length ? (
          <div className="w-full rounded-md border bg-muted/20 px-3 py-3 sm:w-[22rem] sm:ml-auto sm:self-end">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Paid per participant
            </p>
            <ul className="mt-2 space-y-1">
              {summary.entries
                .sort((a, b) => b.amount - a.amount)
                .map(({ memberId, amount }) => {
                  const name =
                    group.members.find((m) => m.id === memberId)?.displayName ??
                    memberId;
                  return (
                    <li
                      key={memberId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{name}</span>
                      <span className="font-medium">
                        {formatCurrency(amount)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pt-3">
        {summary.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GroupMembers({ group }: { group: GroupWithHandlers }) {
  return (
    <Card className="border-muted bg-background">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Everyone who can participate in expenses.
          </CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={group._toggleAddMember}>
          + Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="space-y-2">
            {group.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-col rounded-lg border bg-muted/30 p-3"
              >
                <span className="font-medium text-foreground">
                  {member.displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {member.email || "No email provided"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GroupExpenses({
  group,
  onSelectExpense,
  actionsSlot,
}: {
  group: GroupWithHandlers;
  onSelectExpense: (expense: Expense) => void;
  actionsSlot?: React.ReactNode;
}) {
  const sortedExpenses = useMemo(
    () =>
      [...group.expenses].sort(
        (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      ),
    [group.expenses]
  );

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Expenses</CardTitle>
        </div>
        {actionsSlot ?? null}
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
        ) : (
          sortedExpenses.map((expense) => (
            <button
              type="button"
              key={expense.id}
              onClick={() => onSelectExpense(expense)}
              className="w-full rounded-lg border bg-muted/20 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {expense.name || "Expense"}
                </p>
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
                <p className="text-base font-semibold text-foreground tabular-nums w-24 text-right">
                  {formatAmount(expense)}
                </p>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupId = id ?? "";
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showUploadOnly, setShowUploadOnly] = useState(false);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });

  return (
    <ProtectedRoute>
      <AppShell>
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">
                Unable to load group
              </CardTitle>
              <CardDescription className="text-destructive">
                {error.message || "Please try again later."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : data ? (
          <div className="space-y-6">
            <Card className="border-muted bg-gradient-to-br from-background via-background to-muted/60">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-semibold">
                      {data.name}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(data.createdAt).toLocaleDateString()} ·
                      Updated {new Date(data.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{data.type}</Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start">
              <div className="space-y-4">
                <GroupCostsCard group={data} />
                <PaymentsCard group={data} />
                <GroupMembers
                  group={{
                    ...data,
                    _toggleAddMember: () => setShowAddMember(true),
                    _toggleUpload: () => setShowUploadOnly(true),
                  }}
                />
              </div>
              <GroupExpenses
                group={{
                  ...data,
                  _toggleAddExpense: () => setShowAddExpense(true),
                  _toggleUpload: () => setShowUploadOnly(true),
                }}
                actionsSlot={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={data._toggleAddExpense}
                    >
                      + Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => data._toggleUpload?.()}
                    >
                      Upload
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/groups/${data.id}/uploads`}>Batch uploads</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/groups/${data.id}/expenses`}>View all</Link>
                    </Button>
                  </div>
                }
                onSelectExpense={(expense) => {
                  setSelectedExpense(expense);
                  setIsEditingExpense(false);
                }}
              />
            </div>
          </div>
        ) : null}
      </AppShell>

      <Dialog open={showAddMember} onClose={() => setShowAddMember(false)}>
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>Add a member</CardTitle>
            <CardDescription>
              Invite someone new for future expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddMemberForm groupId={groupId} />
          </CardContent>
        </Card>
      </Dialog>

      <Dialog open={showAddExpense} onClose={() => setShowAddExpense(false)}>
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>Add an expense</CardTitle>
            <CardDescription>
              Log a cost and choose who participated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateExpenseForm
              groupId={groupId}
              members={data?.members ?? []}
              onSuccess={() => setShowAddExpense(false)}
              asCard={false}
            />
          </CardContent>
        </Card>
      </Dialog>

      <Dialog open={showUploadOnly} onClose={() => setShowUploadOnly(false)}>
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>Upload a receipt</CardTitle>
            <CardDescription>
              Upload a PDF, doc, or image and we’ll parse it into an expense
              draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadExpenseSection
              groupId={groupId}
              onCreated={(expense) => {
                setShowUploadOnly(false);
                queryClient.invalidateQueries({ queryKey: ["group", groupId] });
              }}
            />
          </CardContent>
        </Card>
      </Dialog>

      <Dialog
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
      >
        {selectedExpense ? (
          <ExpenseDialogContent
            groupId={groupId}
            expense={selectedExpense}
            members={data?.members ?? []}
            onClose={() => setSelectedExpense(null)}
            onExpenseUpdate={(updated) => setSelectedExpense(updated)}
            isEditing={isEditingExpense}
            onEdit={() => setIsEditingExpense(true)}
          />
        ) : null}
      </Dialog>
    </ProtectedRoute>
  );
}

type ExpenseDialogProps = {
  expense: Expense;
  groupId: string;
  members: Group["members"];
  onClose: () => void;
  onExpenseUpdate?: (expense: Expense) => void;
  isEditing: boolean;
  onEdit: () => void;
};

function ExpenseDialogContent({
  expense,
  groupId,
  members,
  onClose,
  onExpenseUpdate,
  isEditing,
  onEdit,
}: ExpenseDialogProps) {
  const queryClient = useQueryClient();
  const expenseQuery = useQuery({
    queryKey: ["expense", expense.id],
    queryFn: () => fetchExpense(expense.id),
    initialData: expense,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const currentExpense = expenseQuery.data ?? expense;
  const formatParticipantCost = (value?: string) => {
    if (!value) return null;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currentExpense.currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const handlePaymentSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ["expense", expense.id] });
    await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    setShowPaymentModal(false);
    onClose();
  };

  if (isEditing) {
    return (
      <Card className="border-none shadow-none max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit expense</CardTitle>
          <CardDescription>
            Update details, participants, and uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-6">
              {currentExpense.uploads && currentExpense.uploads.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Uploads
                  </p>
                  <ul className="space-y-2">
                    {currentExpense.uploads.map((upload) => (
                      <li
                        key={upload.id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {upload.originalFileName}
                        </span>
                        {upload.signedUrl || upload.fileUrl ? (
                          <a
                            href={
                              upload.signedUrl ?? upload.fileUrl ?? undefined
                            }
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

              <CreateExpenseForm
                groupId={groupId}
                members={members}
                onSuccess={(savedExpense) => {
                  queryClient.invalidateQueries({
                    queryKey: ["group", groupId],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["expense", expense.id],
                  });
                  onExpenseUpdate?.(savedExpense);
                  onClose();
                }}
                asCard={false}
                initialExpense={currentExpense}
                onDelete={async (id) => {
                  await deleteExpense(id);
                  await queryClient.invalidateQueries({
                    queryKey: ["group", groupId],
                  });
                  onClose();
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPaymentModal) {
    return (
      <AddPaymentContent
        expense={currentExpense}
        members={members}
        onClose={() => setShowPaymentModal(false)}
        onSaved={handlePaymentSaved}
      />
    );
  }

  return (
    <>
      <Card className="border-none shadow-none max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">
              {currentExpense.name || "Expense"} ·{" "}
              {formatAmount(currentExpense)}
            </CardTitle>
            <CardDescription>
              {new Date(currentExpense.date).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })}{" "}
              · Split {currentExpense.splitType.toLowerCase()}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {currentExpense.description ? (
            <p className="text-foreground">{currentExpense.description}</p>
          ) : null}
          <div className="space-y-1">
            <p className="font-medium text-foreground">Participants</p>
            {currentExpense.participants.length ? (
              <ul className="space-y-1 text-muted-foreground">
                {currentExpense.participants.map((p) => {
                  const participantName =
                    members.find((m) => m.id === p.memberId)?.displayName ||
                    p.memberId;
                  const cost = formatParticipantCost(
                    currentExpense.participantCosts?.[p.memberId]
                  );
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-foreground">{participantName}</span>
                      <span>{cost ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">None</p>
            )}
          </div>
          {currentExpense.lineItems.length ? (
            <div className="space-y-2">
              <p className="font-medium text-foreground">Line items</p>
              <ul className="space-y-1 text-muted-foreground">
                {currentExpense.lineItems.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.description || "Item"}</span>
                    <span>
                      {formatAmount({
                        ...currentExpense,
                        amount: item.totalAmount,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {currentExpense.uploads && currentExpense.uploads.length ? (
            <div className="space-y-2">
              <p className="font-medium text-foreground">Uploads</p>
              <ul className="space-y-1">
                {currentExpense.uploads.map((upload) => (
                  <li
                    key={upload.id}
                    className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {upload.originalFileName}
                    </span>
                    {upload.signedUrl || upload.fileUrl ? (
                      <a
                        href={upload.signedUrl ?? upload.fileUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        View
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentModal(true)}
            >
              Add payment
            </Button>
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AddPaymentContent({
  expense,
  members,
  onClose,
  onSaved,
}: {
  expense: Expense;
  members: Group["members"];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const totalPaid = (expense.payments ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
  const outstanding = Math.max(Number(expense.amount) - totalPaid, 0);
  const [amount, setAmount] = useState(
    outstanding ? outstanding.toFixed(2) : ""
  );
  const [payerId, setPayerId] = useState<string>(members[0]?.id ?? "");
  const [paidAt, setPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!payerId) throw new Error("Select a payer");
      if (!amount || Number.isNaN(Number(amount)))
        throw new Error("Enter a valid amount");
      await payExpense({
        expenseId: expense.id,
        amount: Number(amount),
        payerMemberId: payerId,
        notes: notes || undefined,
        paidAt,
        receiptUrl: receiptUrl || undefined,
      });
    },
    onSuccess: async () => {
      setAmount("");
      setNotes("");
      setReceiptUrl("");
      await onSaved();
    },
    onError: (err: any) => {
      setError(err?.message ?? "Could not add payment");
    },
  });

  return (
    <Card className="border-none shadow-none max-h-[80vh] overflow-y-auto">
      <CardHeader>
        <CardTitle>Add payment</CardTitle>
        <CardDescription>Record a payment toward this expense.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              {members.map((member) => (
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
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving..." : "Add payment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
