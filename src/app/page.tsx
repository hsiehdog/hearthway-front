"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";

const features = [
  {
    title: "Transparent receipts",
    description:
      "Snap or upload receipts to keep every shared expense visible, whether it’s a home repair or a dinner abroad.",
  },
  {
    title: "Flexible splits",
    description:
      "Divide costs evenly, by percentages, or by shares so Project Mode and Trip Mode both stay fair.",
  },
  {
    title: "Confident settlement",
    description:
      "See live balances and suggested paybacks so everyone knows who owes what before settling up.",
  },
];

export default function Home() {
  const router = useRouter();
  const { data } = authClient.useSession();

  useEffect(() => {
    if (data?.session) {
      router.replace("/dashboard");
    }
  }, [data?.session, router]);

  if (data?.session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20">
        <section className="space-y-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Shared expenses without the drama
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Hearthway keeps groups square, at home or on the road
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
              Track shared repairs, clubs, and trips in one place. Log expenses, attach receipts, choose the right split (even, percentage, or shares), and let Hearthway keep running balances for everyone.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup">Create workspace</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-muted bg-background/80">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border bg-background/70 p-6 shadow-lg">
          <Card className="border-none bg-transparent shadow-none">
            <CardHeader>
              <CardTitle>Plug in your backend</CardTitle>
              <CardDescription>
                Point <code className="rounded bg-muted px-2 py-1 text-xs">NEXT_PUBLIC_AUTH_BASE_URL</code> (and optional{" "}
                <code className="rounded bg-muted px-2 py-1 text-xs">NEXT_PUBLIC_AUTH_BASE_PATH</code>) to your backend&apos;s Better Auth route, then call your APIs with the Better Auth session cookie automatically included.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <div>
                <p className="font-semibold text-foreground">Authentication</p>
                <p>
                  Better Auth runs on your backend. Expose it via{" "}
                  <code className="rounded bg-muted px-1">
                    NEXT_PUBLIC_AUTH_BASE_URL + NEXT_PUBLIC_AUTH_BASE_PATH
                  </code>{" "}
                  so the frontend can call it.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Expense engine</p>
                <p>Dashboard, trip panels, and chat call your API through a typed helper that automatically forwards the signed Better Auth session cookie.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
