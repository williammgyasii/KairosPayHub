import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export type DistributionChartItem = {
  name: string
  fullName: string
  members: number
  fill: string
}

export function DistributionChartLegend({ items }: { items: DistributionChartItem[] }) {
  if (items.length === 0) return null

  return (
    <ul className="space-y-1.5" role="list" aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.fullName} className="flex items-start gap-2 text-[11px] leading-tight">
          <span
            className="mt-1 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.fill }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium" title={item.fullName}>
              {item.fullName}
            </p>
            <p className="tabular-nums text-muted-foreground">
              {item.members} member{item.members === 1 ? '' : 's'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function DistributionPieChart({
  data,
  innerRadius = 40,
  outerRadius = 68,
}: {
  data: DistributionChartItem[]
  innerRadius?: number
  outerRadius?: number
}) {
  return (
    <div className="flex h-full min-h-0 gap-2 sm:gap-3">
      <div className="min-h-0 min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="members"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.fullName} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, props) => [
                value,
                (props.payload as DistributionChartItem).fullName,
              ]}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex w-[42%] max-w-[9rem] shrink-0 flex-col justify-center overflow-y-auto sm:max-w-[10rem]">
        <DistributionChartLegend items={data} />
      </div>
    </div>
  )
}
