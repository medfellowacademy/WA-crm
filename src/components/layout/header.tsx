"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Menu, Settings as SettingsIcon, User } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/contacts": "Contacts",
  "/pipelines": "Pipelines",
  "/broadcasts": "Broadcasts",
  "/automations": "Automations",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path));
  return match ? match[1] : "Dashboard";
}

type AgentStatus = "online" | "away" | "offline";

const STATUS_COLORS: Record<AgentStatus, string> = {
  online: "bg-green-400",
  away: "bg-amber-400",
  offline: "bg-slate-500",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const title = getPageTitle(pathname);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("offline");

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  useEffect(() => {
    fetch("/api/agent-status")
      .then((r) => r.json())
      .then((d) => { if (d.status) setAgentStatus(d.status as AgentStatus); })
      .catch(() => {});
  }, []);

  const updateStatus = useCallback(async (s: AgentStatus) => {
    setAgentStatus(s);
    const res = await fetch("/api/agent-status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      setAgentStatus(agentStatus);
    }
  }, [agentStatus]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-white sm:text-lg">
          {title}
        </h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-slate-800/70 focus:bg-slate-800/70 focus:outline-none data-popup-open:bg-slate-800/70 sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label="Open account menu"
        >
          <div className="relative">
            <Avatar className="size-8">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            {/* Status dot */}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950",
                STATUS_COLORS[agentStatus]
              )}
            />
          </div>
          <span className="hidden text-sm font-medium text-white sm:inline">
            {profile?.full_name ?? "User"}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-slate-900 text-slate-100 ring-slate-700"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-white">
              {profile?.full_name ?? "User"}
            </p>
            <p className="truncate text-xs text-slate-400">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-slate-800" />

          {/* Status sub-section */}
          <div className="px-2 py-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </p>
            {(["online", "away", "offline"] as AgentStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-800",
                  agentStatus === s ? "text-white" : "text-slate-400"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", STATUS_COLORS[s])} />
                {STATUS_LABELS[s]}
                {agentStatus === s && (
                  <span className="ml-auto text-[10px] text-primary">●</span>
                )}
              </button>
            ))}
          </div>

          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem
            render={
              <Link href="/settings?tab=profile" className="text-slate-200 focus:bg-slate-800 focus:text-white" />
            }
          >
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link href="/settings?tab=whatsapp" className="text-slate-200 focus:bg-slate-800 focus:text-white" />
            }
          >
            <SettingsIcon className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-slate-200 focus:bg-slate-800 focus:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
