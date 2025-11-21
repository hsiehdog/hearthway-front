"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Group, createExpense, Expense } from "@/lib/api-client";

type Props = {
  groupId: string;
  members: Group["members"];
  onSuccess?: () => void;
  asCard?: boolean;
  initialExpense?: Expense;
};

type ParticipantState = Record<string, { checked: boolean; shareAmount?: string }>;

export function CreateExpenseForm({
  groupId,
  members,
  onSuccess,
  asCard = true,
  initialExpense,
}: Props) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(initialExpense?.amount ?? "");
  const [currency, setCurrency] = useState(initialExpense?.currency ?? "USD");
  const [date, setDate] = useState(
    () => initialExpense?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [category, setCategory] = useState(initialExpense?.category ?? "");
  const [note, setNote] = useState(initialExpense?.note ?? "");
  const [splitType, setSplitType] = useState<"EVEN" | "PERCENT" | "SHARES">(
    initialExpense?.splitType ?? "EVEN",
  );
  const [payerId, setPayerId] = useState<string | "pending">(
    initialExpense?.payerId ?? members[0]?.id ?? "pending",
  );
  const [participants, setParticipants] = useState<ParticipantState>(() => {
    if (initialExpense) {
      const map: ParticipantState = {};
      members.forEach((member) => {
        const match = initialExpense.participants.find((p) => p.memberId === member.id);
        map[member.id] = {
          checked: Boolean(match),
          shareAmount: match?.shareAmount ?? undefined,
        };
      });
      return map;
    }
    return members.reduce<ParticipantState>((acc, member) => {
      acc[member.id] = { checked: true };
      return acc;
    }, {});
  });

  const mutation = useMutation({
    mutationFn: () =>
      createExpense({
        groupId,
        payerMemberId: payerId === "pending" ? undefined : payerId,
        status: payerId === "pending" ? "PENDING" : "PAID",
        amount: Number(amount),
        currency,
        date,
        category: category || undefined,
        note: note || undefined,
        splitType,
        participants: Object.entries(participants)
          .filter(([, value]) => value.checked)
          .map(([memberId, value]) => ({
            memberId,
            shareAmount: value.shareAmount ? Number(value.shareAmount) : undefined,
          })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setAmount("");
      setCategory("");
      setNote("");
      onSuccess?.();
    },
  });

  const selectedCount = useMemo(
    () => Object.values(participants).filter((p) => p.checked).length,
    [participants],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!amount || Number.isNaN(Number(amount))) return;
    mutation.mutate();
  };

  const toggleParticipant = (memberId: string) => {
    setParticipants((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], checked: !prev[memberId]?.checked },
    }));
  };

  const updateShareAmount = (memberId: string, value: string) => {
    setParticipants((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], shareAmount: value },
    }));
  };

  const form = (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-[1fr_120px]">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="pl-9"
              required
            />
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
            <CalendarDays className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payer">Payer</Label>
          <select
            id="payer"
            value={payerId}
            onChange={(event) => setPayerId(event.target.value as string | "pending")}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="pending">Pending</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Mark as pending if no one has paid yet; add a payer later.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="e.g., Dinner, Supplies"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="splitType">Split type</Label>
          <select
            id="splitType"
            value={splitType}
            onChange={(event) =>
              setSplitType(event.target.value as "EVEN" | "PERCENT" | "SHARES")
            }
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="EVEN">Even</option>
            <option value="PERCENT">Percent</option>
            <option value="SHARES">Shares</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add context about this expense"
        />
      </div>

      {payerId !== "pending" ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Split among</p>
            <p className="text-xs text-muted-foreground">{selectedCount} selected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const state = participants[member.id];
              const isSelected = Boolean(state?.checked);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                  aria-pressed={isSelected}
                >
                  {member.displayName}
                </button>
              );
            })}
          </div>
          {splitType !== "EVEN" ? (
            <div className="space-y-2 pt-2">
              {members
                .filter((m) => participants[m.id]?.checked)
                .map((member) => {
                  const state = participants[member.id];
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                      <span>{member.displayName}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        className="h-9 w-28"
                        placeholder={splitType === "PERCENT" ? "%" : "Shares"}
                        value={state?.shareAmount ?? ""}
                        onChange={(event) => updateShareAmount(member.id, event.target.value)}
                      />
                    </div>
                  );
                })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Add expense"}
        </Button>
        {mutation.error ? (
          <p className="text-sm text-destructive">
            {mutation.error.message || "Could not create expense."}
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">Expense saved.</p>
        ) : null}
      </div>
    </form>
  );

  if (!asCard) {
    return form;
  }

  return (
    <Card className="border-muted bg-background">
      <CardHeader>
        <CardTitle>Add an expense</CardTitle>
        <CardDescription>
          Log a cost, choose who paid, and select participants for the split.
        </CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  );
}
