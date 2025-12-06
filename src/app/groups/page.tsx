"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Group, fetchGroups } from "@/lib/api-client";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const { data, isPending, error } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => fetchGroups(),
  });

  const handleCreated = () => {
    setShowModal(false);
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Groups</h1>
              <p className="text-sm text-muted-foreground">
                Projects and trips you belong to.
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create new group
            </Button>
          </div>

          {isPending ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="border-destructive/30 bg-destructive/10">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Unable to load groups
                </CardTitle>
                <CardDescription className="text-destructive">
                  {(error as Error).message || "Please try again later."}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data?.length ? (
                data.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <Card className="h-full border-muted bg-background transition hover:-translate-y-0.5 hover:shadow-md">
                      <CardHeader>
                        <CardTitle>{group.name}</CardTitle>
                        <CardDescription className="flex items-center justify-between">
                          <span className="uppercase tracking-wide text-xs">
                            {group.type}
                          </span>
                          <span className="text-xs">
                            Updated{" "}
                            {new Date(group.updatedAt).toLocaleDateString()}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {group.members.length} member
                        {group.members.length === 1 ? "" : "s"} ·{" "}
                        {group.expenses.length} expense
                        {group.expenses.length === 1 ? "" : "s"}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="border-muted bg-muted/30">
                  <CardHeader>
                    <CardTitle>No groups yet</CardTitle>
                    <CardDescription>
                      Start with a project for household/club expenses or a trip
                      for flexible splits.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setShowModal(true)}>
                      Create your first group
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create a group</DialogTitle>
              <DialogDescription>
                Spin up a project or trip for shared expenses.
              </DialogDescription>
            </DialogHeader>
            <CreateGroupForm onCreated={handleCreated} />
          </DialogContent>
        </Dialog>
      </AppShell>
    </ProtectedRoute>
  );
}
