import { format } from 'date-fns'
import { Timer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyStudyTotal } from '@/lib/dashboard-stats'
import { formatMinutes } from '@/utils/format'

interface StudyTimeChartProps {
  days: DailyStudyTotal[]
}

/** Bar chart of study minutes per day this week. One series, so no legend. */
export function StudyTimeChart({ days }: StudyTimeChartProps) {
  const total = days.reduce((sum, d) => sum + d.minutes, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study time this week</CardTitle>
        <CardDescription>
          {total > 0 ? `${formatMinutes(total)} total · all courses` : 'Monday to Sunday · all courses'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState icon={Timer} title="No study sessions this week" description="Sessions you record in the Study Tracker will be charted here." />
        ) : (
          <>
            <div className="h-56" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={44}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    tickFormatter={(m: number) => `${m}m`}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const day = payload[0].payload as DailyStudyTotal
                      return (
                        <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
                          <p className="text-muted-foreground">{format(day.date, 'EEEE, d MMM')}</p>
                          <p className="font-medium text-foreground">{formatMinutes(day.minutes)}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Screen readers get the same numbers as a table instead of the chart. */}
            <table className="sr-only">
              <caption>Study minutes per day this week</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Study time</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.label}>
                    <th scope="row">{format(d.date, 'EEEE')}</th>
                    <td>{formatMinutes(d.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
