import { Link, useLocation } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Login01Icon, Logout01Icon } from "@hugeicons/core-free-icons"

import { DionMascot } from "@/components/shared/dion-mascot"
import { NAV_GROUPS, type NavItem } from "@/components/shell/nav-config"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Capability } from "@/lib/api/types"
import { useCapabilities } from "@/hooks/use-workspace"
import { useAuth } from "@/providers/auth-provider"

function isItemActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/"
  return pathname === url || pathname.startsWith(`${url}/`)
}

function NavEntry({
  item,
  capabilities,
}: {
  item: NavItem
  capabilities: Capability[] | undefined
}) {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const capability = item.capability
    ? capabilities?.find((entry) => entry.key === item.capability)
    : undefined
  // Capabilities load only after sign-in; with no data, show no gate badge
  // rather than labelling every studio "Soon".
  const gated =
    item.capability !== undefined &&
    capabilities !== undefined &&
    capability?.available !== true
  const badge = gated ? (capability?.release ?? "Soon") : null
  // Blocked studios stay reachable but explain why (e.g. USD cap unset).
  const blockedReason = gated ? (capability?.reason ?? null) : null

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isItemActive(location.pathname, item.url)}
        tooltip={
          blockedReason ? `${item.title} — ${blockedReason}` : item.title
        }
        render={
          <Link
            to={item.url}
            onClick={() => setOpenMobile(false)}
            title={blockedReason ?? undefined}
            aria-label={
              blockedReason
                ? `${item.title} (blocked: ${blockedReason})`
                : undefined
            }
          >
            <HugeiconsIcon icon={item.icon} strokeWidth={2} />
            <span>{item.title}</span>
          </Link>
        }
      />
      {badge ? (
        <SidebarMenuBadge className="text-muted-foreground">
          {badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { data: capabilities } = useCapabilities()
  const { status, ownerName, logout } = useAuth()
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {/* Full lockup when expanded; symbol-only head on the collapsed rail. */}
          <DionMascot
            variant="logo"
            size="md"
            alt="Dion"
            loading="eager"
            className="group-data-[collapsible=icon]:hidden"
          />
          <DionMascot
            variant="logoMark"
            size="icon"
            alt="Dion"
            loading="eager"
            className="hidden size-8 group-data-[collapsible=icon]:block"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavEntry
                    key={item.url}
                    item={item}
                    capabilities={capabilities}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {status === "authenticated" ? (
              <SidebarMenuButton
                tooltip="Sign out"
                onClick={() => void logout()}
              >
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                <span>Sign out{ownerName ? ` (${ownerName})` : ""}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                tooltip="Sign in"
                render={
                  <Link to="/login" state={{ from: location.pathname }} />
                }
              >
                <HugeiconsIcon icon={Login01Icon} strokeWidth={2} />
                <span>Sign in</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
