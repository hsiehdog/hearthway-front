"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
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
import { changeUserPassword, updateUserProfile } from "@/lib/api-client";

export default function SettingsPage() {
  const { data } = authClient.useSession();
  const fullName = data?.user?.name || "";
  const [nameInput, setNameInput] = useState(fullName);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const parseErrorMessage = useMemo(() => {
    return (error: unknown) => {
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          const fieldError =
            parsed?.errors?.fieldErrors?.name?.[0] ||
            parsed?.errors?.fieldErrors?.currentPassword?.[0] ||
            parsed?.errors?.fieldErrors?.newPassword?.[0];
          return fieldError || parsed?.message || error.message;
        } catch {
          return error.message;
        }
      }
      return "Unexpected error. Please try again.";
    };
  }, []);

  useEffect(() => {
    setNameInput(fullName);
  }, [fullName]);

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFeedback(null);

    startProfileTransition(async () => {
      try {
        await updateUserProfile({ name: nameInput });
        setProfileFeedback({
          type: "success",
          message: "Profile updated.",
        });
      } catch (error) {
        setProfileFeedback({
          type: "error",
          message: parseErrorMessage(error),
        });
      }
    });
  };

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordFeedback(null);

    startPasswordTransition(async () => {
      try {
        await changeUserPassword({
          currentPassword,
          newPassword,
        });
        setPasswordFeedback({
          type: "success",
          message: "Password updated.",
        });
        setCurrentPassword("");
        setNewPassword("");
      } catch (error) {
        setPasswordFeedback({
          type: "error",
          message: parseErrorMessage(error),
        });
      }
    });
  };
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Account settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Update your profile and session preferences. Everything here saves
              straight to your backend.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Basic details that other teammates can see.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleProfileSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      placeholder="Ada Lovelace"
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                    />
                  </div>
                  {profileFeedback && (
                    <p
                      className={`text-sm ${
                        profileFeedback.type === "error"
                          ? "text-destructive"
                          : "text-emerald-600"
                      }`}
                    >
                      {profileFeedback.message}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isProfilePending}
                  >
                    {isProfilePending ? "Saving…" : "Save profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session</CardTitle>
                <CardDescription>
                  Reset your password whenever needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                  {passwordFeedback && (
                    <p
                      className={`text-sm ${
                        passwordFeedback.type === "error"
                          ? "text-destructive"
                          : "text-emerald-600"
                      }`}
                    >
                      {passwordFeedback.message}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPasswordPending}
                  >
                    {isPasswordPending ? "Updating…" : "Update password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
