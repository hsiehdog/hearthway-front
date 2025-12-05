"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { authClient } from "@/lib/auth/client";

export default function AccountPage() {
  const router = useRouter();
  const { data } = authClient.useSession();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">
                  {data?.user?.name || "Teammate"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">
                  {data?.user?.email || "Not provided"}
                </p>
              </div>
              <div className="pt-2">
                <Button variant="destructive" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
