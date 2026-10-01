import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const resolvedDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        resolvedDark ? "Switch to light theme" : "Switch to dark theme"
      }
      onClick={() => setTheme(resolvedDark ? "light" : "dark")}
    >
      <HugeiconsIcon
        icon={resolvedDark ? Sun01Icon : Moon02Icon}
        strokeWidth={2}
      />
    </Button>
  )
}
