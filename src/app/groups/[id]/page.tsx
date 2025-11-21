"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { Expense, Group, fetchGroup } from "@/lib/api-client";

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
};

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
}: {
  group: GroupWithHandlers;
  onSelectExpense: (expense: Expense) => void;
}) {
  const sortedExpenses = useMemo(
    () =>
      [...group.expenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [group.expenses]
  );

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            Latest costs with participants and splits.
          </CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={group._toggleAddExpense}>
          + Add
        </Button>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {expense.category || "Expense"} · {formatAmount(expense)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString()} · Split{" "}
                    {expense.splitType.toLowerCase()}
                  </p>
                </div>
              </div>
              {expense.note ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {expense.note}
                </p>
              ) : null}
              <Separator className="my-3" />
              <div className="text-xs text-muted-foreground">
                {expense.payerId ? (
                  <p>
                    Paid by:{" "}
                    {group.members.find((m) => m.id === expense.payerId)
                      ?.displayName || "Member"}
                  </p>
                ) : (
                  <p>Not paid yet</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {expense.participants.length === 0 ? (
                  <p>No participants listed.</p>
                ) : (
                  <p>
                    Split among:{" "}
                    {expense.participants
                      .map((participant) => {
                        const member = group.members.find(
                          (m) => m.id === participant.memberId
                        );
                        return member?.displayName || participant.memberId;
                      })
                      .join(", ")}
                  </p>
                )}
              </div>
              {expense.lineItems.length ? (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Line items</p>
                  {expense.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.description || "Item"}</span>
                      <span>{item.totalAmount}</span>
                    </div>
                  ))}
                </div>
              ) : null}
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
                  <Badge variant="secondary">{data.type}</Badge>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start">
              <GroupMembers
                group={{
                  ...data,
                  _toggleAddMember: () => setShowAddMember(true),
                }}
              />
              <GroupExpenses
                group={{
                  ...data,
                  _toggleAddExpense: () => setShowAddExpense(true),
                }}
                onSelectExpense={(expense) => setSelectedExpense(expense)}
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

      <Dialog
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
      >
        {selectedExpense ? (
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle>Edit expense</CardTitle>
              <CardDescription>
                Update details and participants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateExpenseForm
                groupId={groupId}
                members={data?.members ?? []}
                onSuccess={() => setSelectedExpense(null)}
                asCard={false}
                initialExpense={selectedExpense}
              />
            </CardContent>
          </Card>
        ) : null}
      </Dialog>
    </ProtectedRoute>
  );
}
