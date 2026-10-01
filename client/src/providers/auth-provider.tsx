import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { setCsrfToken, UNAUTHENTICATED_EVENT } from "@/lib/api/client"
import {
  getSession,
  login as apiLogin,
  logout as apiLogout,
} from "@/lib/api/endpoints"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthState {
  status: AuthStatus
  ownerName: string | null
  /** Set when the session probe itself failed (backend down), not a bad login. */
  sessionError: string | null
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  retrySession: () => void
}

const AuthContext = React.createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = React.useState<AuthStatus>("loading")
  const [ownerName, setOwnerName] = React.useState<string | null>(null)
  const [sessionError, setSessionError] = React.useState<string | null>(null)
  const [probeCount, setProbeCount] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    getSession()
      .then((session) => {
        if (cancelled) return
        setOwnerName(session.owner?.name ?? null)
        setStatus(session.authenticated ? "authenticated" : "unauthenticated")
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setStatus("unauthenticated")
        setSessionError(
          error instanceof Error
            ? error.message
            : "Could not reach the API. Is the backend running?"
        )
      })
    return () => {
      cancelled = true
    }
  }, [probeCount])

  React.useEffect(() => {
    const handleUnauthenticated = () => {
      setCsrfToken(null)
      setOwnerName(null)
      setStatus("unauthenticated")
      queryClient.clear()
    }
    window.addEventListener(UNAUTHENTICATED_EVENT, handleUnauthenticated)
    return () => {
      window.removeEventListener(UNAUTHENTICATED_EVENT, handleUnauthenticated)
    }
  }, [queryClient])

  const login = React.useCallback(
    async (password: string) => {
      const session = await apiLogin(password)
      setCsrfToken(session.csrfToken)
      setOwnerName(session.owner?.name ?? null)
      setSessionError(null)
      setStatus("authenticated")
      queryClient.clear()
    },
    [queryClient]
  )

  const logout = React.useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setCsrfToken(null)
      setOwnerName(null)
      setStatus("unauthenticated")
      queryClient.clear()
    }
  }, [queryClient])

  const retrySession = React.useCallback(() => {
    setStatus("loading")
    setSessionError(null)
    setProbeCount((count) => count + 1)
  }, [])

  const value = React.useMemo(
    () => ({ status, ownerName, sessionError, login, logout, retrySession }),
    [status, ownerName, sessionError, login, logout, retrySession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
