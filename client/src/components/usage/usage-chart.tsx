import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  credits: {
    label: "Confirmed credits",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface UsageChartProps {
  byDay: { date: string; credits: number }[]
}

/** Last 30 days of confirmed charges. Empty days stay honest zeros. */
export function UsageChart({ byDay }: UsageChartProps) {
  if (byDay.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        No confirmed charges in the last 30 days.
      </p>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-52 w-full">
      <BarChart data={byDay} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={24}
          tickFormatter={(value: string) =>
            new Date(value).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                new Date(String(value)).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })
              }
            />
          }
        />
        <Bar dataKey="credits" fill="var(--color-credits)" radius={3} />
      </BarChart>
    </ChartContainer>
  )
}
