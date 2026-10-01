import { Outlet } from "react-router"

import { PlayerBar } from "@/components/player/player-bar"
import { AppBreadcrumb } from "@/components/shell/app-breadcrumb"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { JobsWatcher } from "@/components/shell/jobs-watcher"
import { SignedOutState } from "@/components/shell/signed-out-state"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useConnection } from "@/hooks/use-workspace"
import { useAuth } from "@/providers/auth-provider"
import { PlayerProvider } from "@/providers/player-provider"

function ConnectionBadge() {
  const { data } = useConnection()
  if (!data) return null
  if (data.mode === "mock") {
    return (
      <Badge variant="outline" className="hidden sm:inline-flex">
        Mock provider
      </Badge>
    )
  }
  if (data.status !== "configured") {
    return (
      <Badge variant="destructive" className="hidden sm:inline-flex">
        Provider {data.status}
      </Badge>
    )
  }
  return null
}

/**
 * App frame (public; page content requires sign-in): collapsible sidebar, top bar with breadcrumb and
 * theme toggle, routed content, and the persistent bottom player.
 */
export function AppShell() {
  const { status } = useAuth()
  const signedIn = status === "authenticated"

  return (
    <PlayerProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-h-svh min-w-0">
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="h-4" />
            <AppBreadcrumb />
            <div className="ml-auto flex items-center gap-2">
              {signedIn ? <ConnectionBadge /> : null}
              <ThemeToggle />
            </div>
          </header>
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-6xl p-4 pb-10 md:p-6">
              {signedIn ? <Outlet /> : <SignedOutState />}
            </div>
          </div>
          <PlayerBar />
        </SidebarInset>
        {signedIn ? <JobsWatcher /> : null}
      </SidebarProvider>
    </PlayerProvider>
  )
}
