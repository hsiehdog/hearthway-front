"use client";

import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, User, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";

type AppShellProps = {
  children: ReactNode;
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/account", label: "Account", icon: User },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data } = authClient.useSession();

  const activeHref = useMemo(
    () =>
      navLinks.find(
        (link) => pathname === link.href || pathname?.startsWith(link.href),
      )?.href,
    [pathname],
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r bg-background transition-all duration-200 md:flex md:flex-col",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <div className="flex items-center justify-between px-3 py-4">
          <span className={cn("text-sm font-semibold", collapsed && "sr-only")}>
            Hearthway
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 pb-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                activeHref === href && "bg-muted text-foreground",
                collapsed && "justify-center gap-0 px-2",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className={cn(collapsed && "sr-only")}>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t px-3 py-3 text-xs text-muted-foreground">
          <p
            className={cn(
              "font-semibold text-foreground",
              collapsed && "sr-only",
            )}
          >
            {data?.user?.name || "Teammate"}
          </p>
          <p className={cn(collapsed && "sr-only")}>
            {data?.user?.email || ""}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-20 pt-6">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-around px-4 py-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground",
                activeHref === href && "text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
