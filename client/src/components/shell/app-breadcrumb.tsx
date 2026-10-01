import * as React from "react"
import { Link, useLocation } from "react-router"

import { ROUTE_LABELS } from "@/components/shell/nav-config"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LINKABLE_PATHS = new Set([
  "/",
  "/create/music",
  "/create/cover",
  "/library",
  "/projects",
  "/jobs",
  "/usage",
  "/settings",
  "/voices",
  "/workflows",
])

const UUID_LIKE = /^[0-9a-f-]{8,}$/i

interface Crumb {
  label: string
  path: string
  linkable: boolean
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Crumb[] = [{ label: "Overview", path: "/", linkable: true }]
  let path = ""
  for (const segment of segments) {
    path += `/${segment}`
    const label = UUID_LIKE.test(segment)
      ? "Detail"
      : (ROUTE_LABELS[segment] ?? segment)
    crumbs.push({ label, path, linkable: LINKABLE_PATHS.has(path) })
  }
  return crumbs
}

export function AppBreadcrumb() {
  const location = useLocation()
  const crumbs = buildCrumbs(location.pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          const hiddenOnMobile = !isLast && crumbs.length > 2 && index === 0
          const visibility = hiddenOnMobile ? "hidden sm:inline-flex" : ""
          return (
            <React.Fragment key={crumb.path}>
              <BreadcrumbItem className={visibility}>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.linkable ? (
                  <BreadcrumbLink
                    render={<Link to={crumb.path}>{crumb.label}</Link>}
                  />
                ) : (
                  <span className="text-muted-foreground">{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast ? (
                <BreadcrumbSeparator
                  className={hiddenOnMobile ? "hidden sm:block" : ""}
                />
              ) : null}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
