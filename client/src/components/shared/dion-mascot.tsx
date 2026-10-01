import { cn } from "cn"

/**
 * Resized WebP derivatives (alpha preserved) of the originals in
 * /public/logo, generated at 2x of their largest display size so the
 * multi-MB source PNGs never ship to the browser. Originals untouched.
 */
const VARIANTS = {
  /** Horizontal lockup: mascot head + "dion" wordmark (480x160). */
  logo: { src: "/mascot/dion-logo.webp", aspect: 3, alt: "Dion" },
  /** Symbol-only head for the collapsed sidebar rail (96x96). */
  logoMark: { src: "/mascot/dion-logo-side.webp", aspect: 1, alt: "Dion" },
  producer: { src: "/mascot/dion-producer.webp", aspect: 1, alt: "" },
  creating: { src: "/mascot/dion-creating.webp", aspect: 1, alt: "" },
  success: { src: "/mascot/dion-success.webp", aspect: 1, alt: "" },
  confused: { src: "/mascot/dion-confused.webp", aspect: 1, alt: "" },
  favorite: { src: "/mascot/dion-favorite.webp", aspect: 1, alt: "" },
  launch: { src: "/mascot/dion-launch.webp", aspect: 1, alt: "" },
  notFound: { src: "/mascot/dion-404.webp", aspect: 1, alt: "" },
} as const

/** Display widths in CSS px (sidebar mark 32, compact 64–96, empty states 144, 404 page 240). */
const SIZES = { icon: 32, xs: 64, sm: 80, md: 96, lg: 144, xl: 240 } as const

export type DionMascotVariant = keyof typeof VARIANTS
export type DionMascotSize = keyof typeof SIZES

interface DionMascotProps {
  variant: DionMascotVariant
  /** Display width: icon 32 · xs 64 · sm 80 · md 96 · lg 144 · xl 240 (CSS px). */
  size?: DionMascotSize
  /** Decorative (empty alt) by default; nearby text carries the meaning. */
  alt?: string
  /** Lazy by default; pass "eager" only for initial-viewport placements. */
  loading?: "eager" | "lazy"
  /** One-shot fade/zoom entrance; skipped under prefers-reduced-motion. */
  entrance?: boolean
  className?: string
}

/** Dion mascot illustration with explicit dimensions (no layout shift). */
export function DionMascot({
  variant,
  size = "md",
  alt,
  loading = "lazy",
  entrance = false,
  className,
}: DionMascotProps) {
  const meta = VARIANTS[variant]
  const width = SIZES[size]
  const height = Math.round(width / meta.aspect)

  return (
    <img
      src={meta.src}
      alt={alt ?? meta.alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      draggable={false}
      className={cn(
        "shrink-0 select-none",
        entrance &&
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
        className
      )}
    />
  )
}
