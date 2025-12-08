"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
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
import { Input } from "@/components/ui/input";
import { Group, fetchGroups } from "@/lib/api-client";
import { createGroup } from "@/lib/api-client";

const formatDateOnly = (value: string) => {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(value);
  if (!match) {
    return { year: NaN, month: "", day: "", label: value };
  }
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return {
    year: Number(y),
    month: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    day: date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
    label: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
};

const formatDateRange = (start?: string | null, end?: string | null, fallback?: string) => {
  if (!start) {
    return fallback ?? "";
  }

  const startParts = formatDateOnly(start);
  if (!end) return startParts.label;

  const endParts = formatDateOnly(end);

  const sameYear = startParts.year === endParts.year;
  const sameMonth = sameYear && startParts.month === endParts.month;

  if (sameYear && sameMonth) {
    return `${startParts.month} ${startParts.day}-${endParts.day}, ${startParts.year}`;
  }

  if (sameYear) {
    return `${startParts.month} ${startParts.day} - ${endParts.month} ${endParts.day}, ${startParts.year}`;
  }

  return `${startParts.month} ${startParts.day}, ${startParts.year} - ${endParts.month} ${endParts.day}, ${endParts.year}`;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showTripModal, setShowTripModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  const [projectName, setProjectName] = useState("");
  const createTrip = useMutation({
    mutationFn: () =>
      createGroup({
        name: tripName.trim(),
        type: "TRIP",
        startDate: tripStart || undefined,
        endDate: tripEnd || undefined,
        location: tripLocation || undefined,
      }),
    onSuccess: () => {
      setTripName("");
      setTripStart("");
      setTripEnd("");
      setTripLocation("");
      setShowTripModal(false);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
  const createProject = useMutation({
    mutationFn: () =>
      createGroup({
        name: projectName.trim(),
        type: "PROJECT",
      }),
    onSuccess: () => {
      setProjectName("");
      setShowProjectModal(false);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
  const { data, isPending, error } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => fetchGroups(),
  });

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectName.trim()) return;
    createProject.mutate();
  };

  const handleCreateTrip = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tripName.trim()) return;
    createTrip.mutate();
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3" />

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
            <div className="space-y-6">
              {data?.some((g) => g.type === "TRIP") ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold">Trips</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {data
                      .filter((g) => g.type === "TRIP")
                      .map((group) => (
                        <Link key={group.id} href={`/groups/${group.id}`}>
                          <Card className="h-full border-muted bg-background transition hover:-translate-y-0.5 hover:shadow-md">
                            <CardHeader>
                              <CardTitle>{group.name}</CardTitle>
                              <CardDescription className="flex items-center justify-between">
                                <span className="uppercase tracking-wide text-xs">
                                  {group.primaryLocation || group.type}
                                </span>
                                <span className="text-xs">
                                  {group.startDate
                                    ? formatDateRange(group.startDate, group.endDate)
                                    : `Updated ${formatDateOnly(group.updatedAt).label}`}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                              {group.members.length} member
                              {group.members.length === 1 ? "" : "s"} · {group.expenses.length} expense
                              {group.expenses.length === 1 ? "" : "s"}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                  </div>
                </div>
              ) : null}

              {data?.some((g) => g.type === "PROJECT") ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold">Projects</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {data
                      .filter((g) => g.type === "PROJECT")
                      .map((group) => (
                        <Link key={group.id} href={`/groups/${group.id}`}>
                          <Card className="h-full border-muted bg-background transition hover:-translate-y-0.5 hover:shadow-md">
                            <CardHeader>
                              <CardTitle>{group.name}</CardTitle>
                              <CardDescription className="flex items-center justify-between">
                                <span className="uppercase tracking-wide text-xs">
                                  {group.primaryLocation || group.type}
                                </span>
                                <span className="text-xs">
                                  {group.startDate
                                    ? formatDateRange(group.startDate, group.endDate)
                                    : `Updated ${formatDateOnly(group.updatedAt).label}`}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                              {group.members.length} member
                              {group.members.length === 1 ? "" : "s"} · {group.expenses.length} expense
                              {group.expenses.length === 1 ? "" : "s"}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-muted bg-muted/20">
                  <CardContent className="space-y-3 py-1">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">✈️ Plan a New Trip</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Build your itinerary, track expenses as you go, and stay
                        organized without the stress.
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>Flights, hotels, meals & activities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>Upload receipts during the trip</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>Automatic shared balances</span>
                      </li>
                    </ul>
                    <div className="flex justify-end">
                      <Button onClick={() => setShowTripModal(true)}>
                        Plan a New Trip
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted bg-muted/20">
                  <CardContent className="space-y-3 py-1">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        🏗 Organize a New Project
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Track every cost, receipt, and payment from start to
                        finish—no spreadsheets needed.
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>Materials, labor, invoices & fees</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>Upload receipts & vendor bills</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>Real-time project spending</span>
                      </li>
                    </ul>
                    <div className="flex justify-end">
                      <Button onClick={() => setShowProjectModal(true)}>
                        Organize a New Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <Dialog open={showTripModal} onOpenChange={setShowTripModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Plan a new trip</DialogTitle>
              <DialogDescription>
                Create a shared or solo trip to organize your itinerary, upload receipts as you go, and keep everyone's spending in sync.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateTrip}>
              <div className="space-y-2">
                <label htmlFor="trip-name" className="text-sm font-medium">
                  Trip name
                </label>
                <Input
                  id="trip-name"
                  placeholder="Summer in Italy, Austin Conference, Family Ski Trip"
                  value={tripName}
                  onChange={(event) => setTripName(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="trip-start" className="text-sm font-medium">
                    Start date
                  </label>
                  <Input
                    id="trip-start"
                    type="date"
                    value={tripStart}
                    onChange={(event) => setTripStart(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="trip-end" className="text-sm font-medium">
                    End date
                  </label>
                  <Input
                    id="trip-end"
                    type="date"
                    value={tripEnd}
                    onChange={(event) => setTripEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="trip-location" className="text-sm font-medium">
                  Location
                </label>
                <Input
                  id="trip-location"
                  placeholder="City, region, or venue"
                  value={tripLocation}
                  onChange={(event) => setTripLocation(event.target.value)}
                />
              </div>
              {createTrip.error ? (
                <p className="text-sm text-destructive">
                  {createTrip.error instanceof Error
                    ? createTrip.error.message
                    : "Could not create trip."}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTripModal(false)}
                  disabled={createTrip.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTrip.isPending}>
                  {createTrip.isPending ? "Creating..." : "Create Trip"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Organize a new project</DialogTitle>
              <DialogDescription>
                Track every cost, receipt, and payment from start to finish.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateProject}>
              <div className="space-y-2">
                <label htmlFor="project-name" className="text-sm font-medium">
                  Project Name
                </label>
                <Input
                  id="project-name"
                  placeholder="Kitchen renovation, school fundraiser, HOA expenses"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  required
                />
              </div>
              {createProject.error ? (
                <p className="text-sm text-destructive">
                  {createProject.error instanceof Error
                    ? createProject.error.message
                    : "Could not create project."}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowProjectModal(false)}
                  disabled={createProject.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </AppShell>
    </ProtectedRoute>
  );
}
