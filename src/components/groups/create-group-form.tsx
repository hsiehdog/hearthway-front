"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateGroupPayload, Group, createGroup } from "@/lib/api-client";

type Props = {
  onCreated?: (group: Group) => void;
};

export function CreateGroupForm({ onCreated }: Props) {
  const router = useRouter();
  const [formState, setFormState] = useState<CreateGroupPayload>({
    name: "",
    type: "PROJECT",
    memberDisplayName: "",
    memberEmail: "",
  });

  const mutation = useMutation<Group, Error, CreateGroupPayload>({
    mutationFn: (payload) => createGroup(payload),
    onSuccess: (group) => {
      onCreated?.(group);
      router.push(`/groups/${group.id}`);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) return;

    mutation.mutate({
      name: formState.name.trim(),
      type: formState.type,
      memberDisplayName: formState.memberDisplayName?.trim() || undefined,
      memberEmail: formState.memberEmail?.trim() || undefined,
    });
  };

  return (
    <Card className="border-muted bg-background">
      <CardHeader>
        <CardTitle>Create a group</CardTitle>
        <CardDescription>
          Spin up a project or trip and auto-add yourself as the first member.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Group name</Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g., Cabin repairs or Barcelona weekend"
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Mode</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formState.type}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, type: event.target.value as Group["type"] }))
                }
              >
                <option value="PROJECT">Project</option>
                <option value="TRIP">Trip</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Projects cover household or club costs; Trips unlock multi-participant splits.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberDisplayName">Your display name</Label>
              <Input
                id="memberDisplayName"
                value={formState.memberDisplayName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, memberDisplayName: event.target.value }))
                }
                placeholder="How teammates will see you"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberEmail">Email (optional)</Label>
            <Input
              id="memberEmail"
              type="email"
              value={formState.memberEmail}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, memberEmail: event.target.value }))
              }
              placeholder="you@example.com"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create group"}
            </Button>
            {mutation.error ? (
              <p className="text-sm text-destructive">
                {mutation.error.message || "Could not create group."}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
