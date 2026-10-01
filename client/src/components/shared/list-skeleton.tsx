import { Skeleton } from "@/components/ui/skeleton"

interface ListSkeletonProps {
  rows?: number
  /** Height utility for each row, defaults to a table-row height. */
  rowClassName?: string
}

/** Loading state used by list pages while the first page is fetched. */
export function ListSkeleton({
  rows = 5,
  rowClassName = "h-10",
}: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={`w-full ${rowClassName}`} />
      ))}
    </div>
  )
}
