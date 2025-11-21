"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMemberToGroup } from "@/lib/api-client";

type Props = {
  groupId: string;
};

export function AddMemberForm({ groupId }: Props) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      addMemberToGroup({
        groupId,
        displayName,
        email: email || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setDisplayName("");
      setEmail("");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    mutation.mutate();
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="displayName">Member name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Teammate name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Adding..." : "Add member"}
        </Button>
        {mutation.error ? (
          <p className="text-sm text-destructive">
            {(mutation.error as Error).message || "Could not add member."}
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">Added.</p>
        ) : null}
      </div>
    </form>
  );
}
