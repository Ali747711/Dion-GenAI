import { Link, useNavigate } from "react-router"

import { DionMascot } from "@/components/shared/dion-mascot"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <DionMascot variant="notFound" size="xl" entrance />
        </EmptyMedia>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>
          This route does not exist in the studio.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            nativeButton={false}
            render={<Link to="/">Back to studio</Link>}
          />
          <Button variant="outline" onClick={() => void navigate(-1)}>
            Go back
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}
