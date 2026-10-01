import * as React from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons"

import { DionMascot } from "@/components/shared/dion-mascot"
import { QueryError } from "@/components/shared/query-error"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api/client"
import { useAuth } from "@/providers/auth-provider"

/** Sign-in page (opened from the sidebar); the workspace data stays private until then. */
export function LoginPage() {
  const { login, sessionError, retrySession } = useAuth()
  const [password, setPassword] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    if (!password) {
      setError("Enter the workspace password.")
      return
    }
    setPending(true)
    setError(null)
    try {
      await login(password)
    } catch (cause) {
      if (isApiError(cause)) {
        setError(
          cause.status === 401 ? "That password is not correct." : cause.message
        )
      } else {
        setError("Could not reach the API. Is the backend running?")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <DionMascot
          variant="logo"
          size="xl"
          loading="eager"
          className="self-center"
        />

        {sessionError ? (
          <QueryError
            title="API unreachable"
            error={new Error(sessionError)}
            onRetry={retrySession}
          />
        ) : null}

        <div className="flex flex-col">
          {/* Dion leans over the card edge: in-flow overlap via negative
              margin, kept outside the Card (which clips its children), so
              the art stays fully visible with no layout shift. */}
          <DionMascot
            variant="producer"
            size="md"
            loading="eager"
            entrance
            className="pointer-events-none relative z-10 -mb-10 self-center"
          />
          <Card>
            <CardHeader className="pt-8 text-center">
              <CardTitle>Welcome to the studio</CardTitle>
              <CardDescription>
                This is a private workspace. Enter the owner password to
                continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => void handleSubmit(event)}>
                <FieldGroup>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      value={password}
                      aria-invalid={error ? true : undefined}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setError(null)
                      }}
                    />
                    {error ? (
                      <FieldError>{error}</FieldError>
                    ) : (
                      <FieldDescription>
                        Sessions use a secure cookie; nothing is stored in the
                        browser.
                      </FieldDescription>
                    )}
                  </Field>
                  <Button type="submit" disabled={pending} className="w-full">
                    {pending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <HugeiconsIcon
                        icon={SquareLock02Icon}
                        data-icon="inline-start"
                      />
                    )}
                    Unlock workspace
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>

        <Button
          variant="ghost"
          className="self-center"
          nativeButton={false}
          render={<Link to="/" />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Back to studio
        </Button>
      </div>
    </div>
  )
}
