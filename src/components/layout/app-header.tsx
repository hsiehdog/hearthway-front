"use client";

import { Bell, MessageSquareMore } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = authClient.useSession();

  const initials = data?.user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <MessageSquareMore className="h-5 w-5 text-primary" />
            <span>Hearthway</span>
            <Badge variant="outline" className="text-xs">
              beta
            </Badge>
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {links.map((link) => (
              <Button
                key={link.href}
                asChild
                variant={
                  pathname === link.href || pathname?.startsWith(link.href)
                    ? "secondary"
                    : "ghost"
                }
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {initials || data?.user?.email?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left text-sm md:block">
                  <p className="font-medium leading-none">
                    {data?.user?.name || "Teammate"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data?.user?.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>Account settings (soon)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
