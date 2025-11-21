"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function GroupsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <CreateGroupForm />
            <Card className="border-muted bg-muted/30">
              <CardHeader>
                <CardTitle>How groups work</CardTitle>
                <CardDescription>
                  Groups keep members, expenses, receipts, and settlements together.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Use a <span className="font-medium text-foreground">Project</span> for household,
                  club, or work expenses. Use a <span className="font-medium text-foreground">Trip</span> when participants change per expense or you need share/percent splits.
                </p>
                <Separator />
                <ul className="space-y-2">
                  <li>• You&apos;re added as the first member automatically.</li>
                  <li>• Expenses include participants, receipts, and optional line items.</li>
                  <li>• Settlements reconcile balances once you&apos;re ready to square up.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
