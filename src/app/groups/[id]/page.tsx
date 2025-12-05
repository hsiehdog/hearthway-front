"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { CreateExpenseForm } from "@/components/groups/create-expense-form";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { X } from "lucide-react";
import { Expense, Group, fetchGroup } from "@/lib/api-client";
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
  _actionsSlot?: React.ReactNode;
};

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

function NetBalancesCard({ group }: { group: Group }) {
  const summary = useMemo(() => {
    const currency = group.expenses[0]?.currency || "USD";
    const expensesWithPayments = group.expenses.filter(
      (expense) => (expense.payments?.length ?? 0) > 0
    );
    const totalPayments = expensesWithPayments.reduce(
      (sum, expense) =>
        sum +
        (expense.payments ?? []).reduce(
          (sub, payment) => sub + Number(payment.amount || 0),
          0
        ),
      0
    );
    const totalExpenseAmount = expensesWithPayments.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const paidByMember = expensesWithPayments.reduce<Record<string, number>>(
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

    const owedByMember = expensesWithPayments.reduce<Record<string, number>>(
      (acc, expense) => {
        const expenseTotal = Number(expense.amount);
        const totalPaid = (expense.payments ?? []).reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );
        expense.participants.forEach((participant) => {
          const fullShare = Number(
            expense.participantCosts?.[participant.memberId] ??
              participant.shareAmount ??
              0
          );
          if (Number.isNaN(fullShare)) return;
          const ratio = expenseTotal > 0 ? fullShare / expenseTotal : 0;
          const owedPortion = totalPaid > 0 ? totalPaid * ratio : 0;
          acc[participant.memberId] =
            (acc[participant.memberId] ?? 0) + owedPortion;
        });
        return acc;
      },
      {}
    );

    const allMemberIds = new Set([
      ...Object.keys(paidByMember),
      ...Object.keys(owedByMember),
    ]);
    const entries = Array.from(allMemberIds).map((memberId) => ({
      memberId,
      paid: paidByMember[memberId] ?? 0,
      owed: owedByMember[memberId] ?? 0,
      net: (paidByMember[memberId] ?? 0) - (owedByMember[memberId] ?? 0),
    }));

    return { currency, entries, totalPayments, totalExpenseAmount };
  }, [group.expenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary.currency,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="space-y-1">
        <CardTitle>Net balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {summary.entries.length ? (
          <ul className="space-y-2">
            {summary.entries
              .sort((a, b) => b.net - a.net)
              .map(({ memberId, net, paid, owed }) => {
                const name =
                  group.members.find((m) => m.id === memberId)?.displayName ??
                  memberId;
                return (
                  <li
                    key={memberId}
                    className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Paid {formatCurrency(paid)} · Costs{" "}
                        {formatCurrency(owed)}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${
                        net >= 0 ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(net)}
                    </span>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        )}
        {summary.totalPayments !== summary.totalExpenseAmount ? (
          <p className="text-xs italic text-muted-foreground text-right">
            Does not include unpaid expenses
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
        (a, b) =>
          new Date(b.createdAt || b.date).getTime() -
          new Date(a.createdAt || a.date).getTime()
      ),
    [group.expenses]
  );
  const recentExpenses = sortedExpenses.slice(0, 3);

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Recent expenses</CardTitle>
        </div>
        {actionsSlot ?? null}
      </CardHeader>
      <CardContent className="space-y-4">
        {recentExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
        ) : (
          recentExpenses.map((expense) => (
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
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupId = id ?? "";
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [showInlineUpload, setShowInlineUpload] = useState(false);
  const [autoOpenUploadPicker, setAutoOpenUploadPicker] = useState(false);
  const uploadCardRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const handleAddMember = () => setShowAddMember(true);
  const handleAddExpense = () => setShowAddExpense(true);

  const { data, isPending, error } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });

  const costsSummary = useMemo(() => {
    if (!data) return null;
    const currency = data.expenses[0]?.currency || "USD";
    const total = data.expenses.reduce((sum, expense) => {
      const amount = Number(expense.amount);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(total);
  }, [data]);

  const paymentsSummary = useMemo(() => {
    if (!data) return null;
    const currency = data.expenses[0]?.currency || "USD";
    const paidTotal = data.expenses.reduce((sum, expense) => {
      const paid = (expense.payments ?? []).reduce((sub, payment) => {
        const amount = Number(payment.amount);
        return sub + (Number.isNaN(amount) ? 0 : amount);
      }, 0);
      return sum + paid;
    }, 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(paidTotal);
  }, [data]);

  const costsPerPerson = useMemo(() => {
    if (!data) return null;
    const currency = data.expenses[0]?.currency || "USD";
    const perParticipant = data.expenses.reduce<Record<string, number>>(
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

    const formatter = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);

    return {
      entries,
      formatter,
    };
  }, [data]);

  const paymentsPerPerson = useMemo(() => {
    if (!data) return null;
    const currency = data.expenses[0]?.currency || "USD";
    const paidByMember = data.expenses.reduce<Record<string, number>>(
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

    const unpaidTotal = data.expenses.reduce((sum, expense) => {
      const paid = (expense.payments ?? []).reduce((sub, payment) => {
        const amount = Number(payment.amount);
        return sub + (Number.isNaN(amount) ? 0 : amount);
      }, 0);
      const remaining = Number(expense.amount) - paid;
      return sum + (Number.isNaN(remaining) ? 0 : Math.max(remaining, 0));
    }, 0);

    const entries = Object.entries(paidByMember).map(
      ([memberId, amount]) => ({
        memberId,
        amount,
      })
    );

    const formatter = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);

    return {
      entries,
      formatter,
      unpaidTotal,
    };
  }, [data]);

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
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{data.type}</Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-muted bg-background">
                <CardHeader className="space-y-0">
                  <CardTitle>Costs</CardTitle>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    {costsSummary ?? "$0.00"}
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-muted bg-background">
                <CardHeader className="space-y-0">
                  <CardTitle>Payments</CardTitle>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    {paymentsSummary ?? "$0.00"}
                  </p>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-muted bg-background gap-2">
                <CardHeader>
                  <CardTitle>Cost per person</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {costsPerPerson && costsPerPerson.entries.length ? (
                    costsPerPerson.entries
                      .sort((a, b) => b.amount - a.amount)
                      .map(({ memberId, amount }) => {
                        const name =
                          data.members.find((m) => m.id === memberId)
                            ?.displayName ?? memberId;
                        return (
                          <div
                            key={memberId}
                            className="flex items-center justify-between rounded-md bg-muted/20 pr-3 pl-0 py-0.5 text-sm"
                          >
                            <span className="text-foreground">{name}</span>
                            <span className="font-semibold tabular-nums">
                              {costsPerPerson.formatter(amount)}
                            </span>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No participant costs yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-muted bg-background gap-2">
                <CardHeader>
                  <CardTitle>Paid per person</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {paymentsPerPerson && paymentsPerPerson.entries.length ? (
                    paymentsPerPerson.entries
                      .sort((a, b) => b.amount - a.amount)
                      .map(({ memberId, amount }) => {
                        const name =
                          data.members.find((m) => m.id === memberId)
                            ?.displayName ?? memberId;
                        return (
                          <div
                            key={memberId}
                            className="flex items-center justify-between rounded-md bg-muted/20 pr-3 pl-0 py-0.5 text-sm"
                          >
                            <span className="text-foreground">{name}</span>
                            <span className="font-semibold tabular-nums">
                              {paymentsPerPerson.formatter(amount)}
                            </span>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No payments recorded yet.
                    </p>
                  )}
                  {paymentsPerPerson &&
                  paymentsPerPerson.unpaidTotal > 0 &&
                  paymentsPerPerson.entries.length ? (
                    <div className="mt-2 flex items-center justify-end gap-1 pr-3 text-xs text-muted-foreground">
                      <span>Unpaid total:</span>
                      <span className="tabular-nums">
                        {paymentsPerPerson.formatter(
                          paymentsPerPerson.unpaidTotal
                        )}
                      </span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <NetBalancesCard group={data} />
              <div className="space-y-4">
                <GroupExpenses
                  group={{
                    ...data,
                    _toggleAddExpense: handleAddExpense,
                  }}
                  actionsSlot={
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddExpense}
                      >
                        Add
                      </Button>
                      {isMobileOrTablet ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowInlineUpload(true);
                            setAutoOpenUploadPicker(true);
                            requestAnimationFrame(() => {
                              uploadCardRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            });
                          }}
                        >
                          Upload
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/groups/${data.id}/uploads`}>
                            Upload
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/groups/${data.id}/expenses`}>
                          View all {data.expenses.length}
                        </Link>
                      </Button>
                    </div>
                  }
                  onSelectExpense={(expense) => {
                    router.push(`/groups/${groupId}/expenses/${expense.id}`);
                  }}
                />
                {isMobileOrTablet && showInlineUpload ? (
                  <Card
                    ref={uploadCardRef}
                    className="border-muted bg-muted/20"
                  >
                    <CardHeader>
                      <CardTitle>Upload a receipt</CardTitle>
                      <CardDescription>
                        Take a photo or choose from your library, then confirm
                        before uploading.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UploadExpenseSection
                        groupId={groupId}
                        autoOpenPicker={autoOpenUploadPicker}
                        onCancel={() => {
                          setShowInlineUpload(false);
                          setAutoOpenUploadPicker(false);
                        }}
                        onCreated={() => {
                          setShowInlineUpload(false);
                          setAutoOpenUploadPicker(false);
                          queryClient.invalidateQueries({
                            queryKey: ["group", groupId],
                          });
                        }}
                      />
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>

            <GroupMembers
              group={{
                ...data,
                _toggleAddMember: handleAddMember,
              }}
            />
          </div>
        ) : null}
      </AppShell>

      <Dialog open={showAddMember} onClose={() => setShowAddMember(false)}>
        <Card className="relative border-none shadow-none">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-20"
            onClick={() => setShowAddMember(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader className="space-y-1 px-3 py-2">
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
        <Card className="relative border-none shadow-none max-h-[90vh] overflow-y-auto">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-20"
            onClick={() => setShowAddExpense(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader className="space-y-1 px-3 py-2">
            <CardTitle>Add an expense</CardTitle>
            <CardDescription>
              Log a cost and choose who participated.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-6 pt-2">
            <CreateExpenseForm
              groupId={groupId}
              members={data?.members ?? []}
              onSuccess={() => setShowAddExpense(false)}
              asCard={false}
            />
          </CardContent>
        </Card>
      </Dialog>
    </ProtectedRoute>
  );
}
