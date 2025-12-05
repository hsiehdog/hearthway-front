"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, DollarSign, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Group, createExpense, Expense, updateExpense } from "@/lib/api-client";
import { useEffect } from "react";

type Props = {
  groupId: string;
  members: Group["members"];
  onSuccess?: (expense: Expense) => void;
  asCard?: boolean;
  initialExpense?: Expense;
  onDelete?: (id: string) => Promise<void> | void;
  paymentsSlot?: React.ReactNode;
};

type ParticipantState = Record<
  string,
  { checked: boolean; shareAmount?: string }
>;
type LineItemState = {
  id: string;
  description: string;
  category: string;
  quantity: string;
  unitAmount: string;
  totalAmount: string;
};

const generateId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export function CreateExpenseForm({
  groupId,
  members,
  onSuccess,
  asCard = true,
  initialExpense,
  onDelete,
  paymentsSlot,
}: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialExpense?.name ?? "");
  const [amount, setAmount] = useState(initialExpense?.amount ?? "");
  const [currency, setCurrency] = useState(initialExpense?.currency ?? "USD");
  const [date, setDate] = useState(
    () =>
      initialExpense?.date?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(
    initialExpense?.description ?? "",
  );
  const [splitType, setSplitType] = useState<"EVEN" | "PERCENT" | "SHARES">(
    initialExpense?.splitType ?? "EVEN",
  );
  const [participants, setParticipants] = useState<ParticipantState>(() => {
    if (initialExpense) {
      const map: ParticipantState = {};
      members.forEach((member) => {
        const match = initialExpense.participants.find(
          (p) => p.memberId === member.id,
        );
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
  const [lineItems, setLineItems] = useState<LineItemState[]>(
    initialExpense
      ? initialExpense.lineItems.map((item) => ({
          id: item.id,
          description: item.description ?? "",
          category: item.category ?? "",
          quantity: item.quantity ?? "1",
          unitAmount: item.unitAmount ?? "",
          totalAmount: item.totalAmount ?? "",
        }))
      : [],
  );

  const mutation = useMutation({
    mutationFn: () => {
      const payloadBase = {
        groupId,
        amount: Number(amount),
        currency,
        date,
        name,
        description: description || undefined,
        splitType,
        participants: Object.entries(participants)
          .filter(([, value]) => value.checked)
          .map(([memberId, value]) => ({
            memberId,
            shareAmount: value.shareAmount
              ? Number(value.shareAmount)
              : undefined,
          })),
        lineItems: lineItems.length
          ? lineItems.map((item) => ({
              description: item.description || undefined,
              category: item.category || undefined,
              quantity: toNumber(item.quantity, 1),
              unitAmount: toNumber(item.unitAmount, 0),
              totalAmount: toNumber(item.totalAmount || item.unitAmount, 0),
            }))
          : undefined,
      };

      if (initialExpense) {
        return updateExpense({
          ...payloadBase,
          id: initialExpense.id,
        });
      }

      return createExpense(payloadBase);
    },
    onSuccess: async (savedExpense) => {
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      if (!initialExpense) {
        setAmount("");
        setDescription("");
        setLineItems([]);
      }
      onSuccess?.(savedExpense);
    },
  });

  const selectedCount = useMemo(
    () => Object.values(participants).filter((p) => p.checked).length,
    [participants],
  );
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    name?: string;
  }>({});
  const [payerId] = useState<string>("");

  const percentError = useMemo(() => {
    if (splitType !== "PERCENT") return "";
    const totalPercent = Object.entries(participants)
      .filter(([, value]) => value.checked)
      .reduce(
        (sum, [, value]) =>
          sum + (value.shareAmount ? Number(value.shareAmount) : 0),
        0,
      );
    return Math.round(totalPercent) === 100
      ? ""
      : "Percents must add up to 100%";
  }, [participants, splitType]);

  const shareError = useMemo(() => {
    if (splitType !== "SHARES") return "";
    const invalidShare = Object.entries(participants)
      .filter(([, value]) => value.checked)
      .some(
        ([, value]) => !value.shareAmount || Number(value.shareAmount) <= 0,
      );
    return invalidShare ? "All shares must be greater than 0" : "";
  }, [participants, splitType]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFieldErrors: { amount?: string; name?: string } = {};
    if (!name.trim()) {
      nextFieldErrors.name = "Name is required";
    }
    if (!amount || Number.isNaN(Number(amount))) {
      nextFieldErrors.amount = "Amount is required";
    }
    setFieldErrors(nextFieldErrors);

    if (nextFieldErrors.amount || nextFieldErrors.name) return;
    if (selectedCount === 0) {
      setParticipantError("Select at least one participant.");
      return;
    }
    setParticipantError(null);
    if (percentError || shareError) return;

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

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: "",
        category: "",
        quantity: "1",
        unitAmount: "",
        totalAmount: "",
      },
    ]);
  };

  const updateLineItem = (
    id: string,
    field: keyof LineItemState,
    value: string,
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: value };
        if (
          (field === "quantity" || field === "unitAmount") &&
          next.quantity &&
          next.unitAmount
        ) {
          const maybeTotal = Number(next.quantity) * Number(next.unitAmount);
          if (!Number.isNaN(maybeTotal)) {
            next.totalAmount = maybeTotal.toFixed(2);
          }
        }
        return next;
      }),
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (lineItems.length === 0) return;
    const total = lineItems.reduce((sum, item) => {
      const value = Number(item.totalAmount || 0);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
    if (!Number.isNaN(total)) {
      setAmount(total.toFixed(2));
    }
  }, [lineItems]);

  useEffect(() => {
    if (!initialExpense) return;
    setAmount(initialExpense.amount ?? "");
    setCurrency(initialExpense.currency ?? "USD");
    setDate(
      initialExpense.date?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
    );
    setName(initialExpense.name ?? "");
    setDescription(initialExpense.description ?? "");
    setSplitType(initialExpense.splitType ?? "EVEN");
    setParticipants(() => {
      const map: ParticipantState = {};
      members.forEach((member) => {
        const match = initialExpense.participants.find(
          (p) => p.memberId === member.id,
        );
        map[member.id] = {
          checked: Boolean(match),
          shareAmount: match?.shareAmount ?? undefined,
        };
      });
      return map;
    });
    setLineItems(
      initialExpense.lineItems.map((item) => ({
        id: item.id,
        description: item.description ?? "",
        category: item.category ?? "",
        quantity: item.quantity ?? "1",
        unitAmount: item.unitAmount ?? "",
        totalAmount: item.totalAmount ?? "",
      })),
    );
  }, [initialExpense, members]);

  const toNumber = (
    value: string | number | undefined,
    fallback: number,
  ): number => {
    if (value === "" || value === undefined) return fallback;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const form = (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2 md:items-end">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., Dinner, Supplies"
            required
          />
          {fieldErrors.name ? (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context about this expense"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr] md:items-end">
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
          {fieldErrors.amount ? (
            <p className="text-xs text-destructive">{fieldErrors.amount}</p>
          ) : null}
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
      </div>

      {fieldErrors.description ? (
        <p className="text-xs text-destructive">{fieldErrors.description}</p>
      ) : null}

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Line items</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={addLineItem}
          >
            + Add item
          </Button>
        </div>
        {lineItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No line items yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-1 text-xs uppercase tracking-wide text-muted-foreground md:grid">
              <span>Description</span>
              <span>Category</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Total</span>
              <span className="sr-only">Actions</span>
            </div>
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 border-b pb-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-3"
              >
                <Input
                  value={item.description}
                  onChange={(event) =>
                    updateLineItem(item.id, "description", event.target.value)
                  }
                />
                <Input
                  value={item.category}
                  onChange={(event) =>
                    updateLineItem(item.id, "category", event.target.value)
                  }
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) =>
                    updateLineItem(item.id, "quantity", event.target.value)
                  }
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitAmount}
                  onChange={(event) =>
                    updateLineItem(item.id, "unitAmount", event.target.value)
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  value={item.totalAmount}
                  onChange={(event) =>
                    updateLineItem(item.id, "totalAmount", event.target.value)
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="justify-self-end text-destructive"
                  onClick={() => removeLineItem(item.id)}
                  aria-label="Remove line item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Split among</p>
          <p className="text-xs text-muted-foreground">
            {selectedCount} selected
          </p>
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
        {participantError ? (
          <p className="text-xs text-destructive">{participantError}</p>
        ) : null}
        {splitType !== "EVEN" ? (
          <div className="space-y-2 pt-2">
            {members
              .filter((m) => participants[m.id]?.checked)
              .map((member) => {
                const state = participants[member.id];
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <span>{member.displayName}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="h-9 w-28"
                      placeholder={splitType === "PERCENT" ? "%" : "Shares"}
                      value={state?.shareAmount ?? ""}
                      onChange={(event) =>
                        updateShareAmount(member.id, event.target.value)
                      }
                    />
                  </div>
                );
              })}
            {(percentError || shareError) && (
              <p className="text-xs text-destructive">
                {percentError || shareError}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {paymentsSlot ? <div className="space-y-2">{paymentsSlot}</div> : null}

      <div className="flex items-center justify-end gap-3">
        {initialExpense && onDelete ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              const ok = window.confirm(
                "Delete this expense? This cannot be undone.",
              );
              if (ok) {
                onDelete(initialExpense.id);
              }
            }}
          >
            Delete expense
          </Button>
        ) : null}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? initialExpense
              ? "Updating..."
              : "Saving..."
            : initialExpense
              ? "Update expense"
              : "Add expense"}
        </Button>
        {mutation.error ? (
          <p className="text-sm text-destructive">
            {mutation.error.message || "Could not save expense."}
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">Saved.</p>
        ) : null}
      </div>
    </form>
  );

  if (!asCard) {
    return <div className="space-y-4">{form}</div>;
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
