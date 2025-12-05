"use client";

import { createAuthClient } from "better-auth/react";

const authBaseURL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "";

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  basePath: process.env.NEXT_PUBLIC_AUTH_BASE_PATH || "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

export type AuthSession = Awaited<
  ReturnType<typeof authClient.getSession>
>["data"];
