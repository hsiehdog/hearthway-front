"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { authClient } from "@/lib/auth/client";

export default function SignupPage() {
  const { data } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (data?.session) {
      router.replace("/dashboard");
    }
  }, [data?.session, router]);

  if (data?.session) {
    return null;
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/40 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 text-center">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Fast onboarding
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Start a Hearthway space for your group
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Create your workspace, invite neighbors or travelers, and wire Better Auth into the backend to keep sessions secure.
          </p>
        </div>

        <AuthForm mode="signup" />
      </div>
    </section>
  );
}
