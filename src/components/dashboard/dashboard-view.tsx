"use client";

import { Sparkles } from "lucide-react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { ProjectsCard } from "@/components/dashboard/projects-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export function DashboardView() {
  const { data } = authClient.useSession();
  const isAuthenticated = Boolean(data?.session);
  const { usageQuery, projectQuery, activityQuery } = useDashboardData(isAuthenticated);

  return (
    <div className="space-y-6">
      <Card className="border-muted bg-gradient-to-br from-background via-background to-muted/60">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              Hey {data?.user?.name || "there"},
            </CardTitle>
            <CardDescription>
              Track shared expenses, trips, and balances in one place.
            </CardDescription>
          </div>
          <div className="hidden rounded-full border px-4 py-2 text-sm font-medium md:flex md:items-center md:gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Settlement ready
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your Better Auth session cookie is reused when calling your backend. Configure{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_API_BASE_URL</code> to point at Hearthway&apos;s expense APIs for live balances and settlements.
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="space-y-4">
          <MetricCards metrics={usageQuery.data} isLoading={usageQuery.isPending} />
          <ProjectsCard
            projects={projectQuery.data}
            isLoading={projectQuery.isPending}
          />
          <ActivityFeed
            activity={activityQuery.data}
            isLoading={activityQuery.isPending}
          />
        </div>
        <div className="space-y-4 lg:sticky lg:top-24">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
