"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Expense, Group, fetchGroup } from "@/lib/api-client";
import { useState } from "react";

type ExpenseRow = {
  id: string;
  name: string;
  displayAmount: number;
  currency: string;
  status: Expense["status"];
  splitLabel: string;
  splitDetail: string;
};

const columns: ColumnDef<ExpenseRow>[] = [
  {
    header: ({ column }) => (
      <div
        className="flex cursor-pointer select-none items-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
      </div>
    ),
    accessorKey: "name",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("name")}</span>,
  },
  {
    header: ({ column }) => (
      <div
        className="flex cursor-pointer select-none items-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Amount
      </div>
    ),
    accessorKey: "displayAmount",
    cell: ({ row }) => {
      const value = row.getValue<number>("displayAmount");
      const currency = row.original.currency || "USD";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    },
  },
  {
    header: ({ column }) => (
      <div
        className="flex cursor-pointer select-none items-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
      </div>
    ),
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "PAID" ? "default" : row.original.status === "REIMBURSED" ? "secondary" : "outline"}>
        {(row.getValue("status") as string)?.toLowerCase()}
      </Badge>
    ),
  },
  {
    header: ({ column }) => (
      <div
        className="flex cursor-pointer select-none items-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Split
      </div>
    ),
    accessorKey: "splitLabel",
    cell: ({ row }) => row.getValue<string>("splitLabel"),
  },
  {
    header: ({ column }) => (
      <div
        className="flex cursor-pointer select-none items-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Participants
      </div>
    ),
    accessorKey: "splitDetail",
    cell: ({ row }) => row.getValue<string>("splitDetail"),
  },
];

export default function GroupExpensesTablePage() {
  const params = useParams<{ id: string }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [participantFilter, setParticipantFilter] = useState<string>("all");

  const { data, isPending, error } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });

  const rows: ExpenseRow[] = useMemo(() => {
    if (!data) return [];
    const memberMap = new Map(data.members.map((m) => [m.id, m.displayName]));
    return data.expenses
      .map((expense) => {
        const participantIds = expense.participants.map((p) => p.memberId);
        if (participantFilter !== "all" && !participantIds.includes(participantFilter)) {
          return null;
        }

        const share =
          participantFilter === "all"
            ? Number(expense.amount)
            : Number(expense.participantCosts?.[participantFilter] ?? 0);

        return {
          id: expense.id,
          name: expense.name || "Expense",
          displayAmount: share,
          currency: expense.currency || "USD",
          status: expense.status,
          splitLabel: expense.splitType === "PERCENT" ? "Percentage" : expense.splitType === "SHARES" ? "Shares" : "Even",
          splitDetail: expense.participants
            .map((p) => {
              const memberName = memberMap.get(p.memberId) ?? p.memberId;
              if (expense.splitType === "PERCENT") {
                return `${memberName} (${p.shareAmount ?? "—"}%)`;
              }
              if (expense.splitType === "SHARES") {
                return `${memberName} (${p.shareAmount ?? "—"})`;
              }
              return memberName;
            })
            .join(", "),
        };
      })
      .filter(Boolean) as ExpenseRow[];
  }, [data, participantFilter]);

  const footerRenderers = useMemo(
    () => ({
      displayAmount: () => {
        const total = rows.reduce((sum, row) => sum + (Number.isFinite(row.displayAmount) ? row.displayAmount : 0), 0);
        const currency = rows[0]?.currency || "USD";
        return (
          <div className="font-semibold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency,
              maximumFractionDigits: 2,
            }).format(total)}
          </div>
        );
      },
    }),
    [rows],
  );

  return (
    <ProtectedRoute>
      <AppShell>
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">Unable to load expenses</CardTitle>
              <CardDescription className="text-destructive">
                {error instanceof Error ? error.message : "Please try again later."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : data ? (
          <Card className="border-muted bg-background">
            <CardHeader>
              <CardTitle>Expenses table</CardTitle>
              <CardDescription>
                Sortable view of all expenses. Filter by participant to see their owed amounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Filter by participant</label>
                <select
                  value={participantFilter}
                  onChange={(e) => setParticipantFilter(e.target.value)}
                  className="flex h-9 w-56 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All</option>
                  {data.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <DataTable columns={columns} data={rows} footerRenderers={footerRenderers} />
            </CardContent>
          </Card>
        ) : null}
      </AppShell>
    </ProtectedRoute>
  );
}
