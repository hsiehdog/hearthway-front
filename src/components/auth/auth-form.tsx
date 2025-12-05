"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

const baseSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Passwords must include at least 8 characters."),
});

const signUpSchema = baseSchema.extend({
  name: z.string().min(2, "Tell us who you are."),
});

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
    name: "",
  });

  const formTitle =
    mode === "login" ? "Welcome back" : "Create an account for Hearthway";
  const formDescription =
    mode === "login"
      ? "Sign in to review balances, manage projects or trips, and keep everyone synced."
      : "Kick-start your space for shared expenses.";

  const primaryAction = mode === "login" ? "Sign in" : "Create account";
  const secondaryCta =
    mode === "login"
      ? { href: "/signup", label: "Need an account? Sign up" }
      : { href: "/login", label: "Already have an account? Sign in" };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "login") {
          const parsed = baseSchema.safeParse(formValues);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || "Invalid credentials.");
            return;
          }

          const { error: signInError } = await authClient.signIn.email({
            email: parsed.data.email,
            password: parsed.data.password,
          });

          if (signInError) {
            throw new Error(signInError.message || "Unable to sign in.");
          }
        } else {
          const parsed = signUpSchema.safeParse(formValues);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || "Invalid details.");
            return;
          }

          const { error: signUpError } = await authClient.signUp.email({
            email: parsed.data.email,
            password: parsed.data.password,
            name: parsed.data.name,
          });

          if (signUpError) {
            throw new Error(signUpError.message || "Unable to sign up.");
          }
        }

        router.push("/dashboard");
        router.refresh();
      } catch (submissionError) {
        if (submissionError instanceof Error) {
          setError(submissionError.message);
          return;
        }

        setError("We couldn’t process that request. Try again.");
      }
    });
  };

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle>{formTitle}</CardTitle>
        <CardDescription>{formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ada Lovelace"
                value={formValues.name}
                onChange={handleChange}
                disabled={isPending}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={formValues.email}
              onChange={handleChange}
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              value={formValues.password}
              onChange={handleChange}
              disabled={isPending}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground"></p>
          )}

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Working on it…" : primaryAction}
          </Button>

          <Button asChild variant="ghost" className="w-full" type="button">
            <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
