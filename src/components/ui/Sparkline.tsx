interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export default function Sparkline({ data, color = '#10B981', height = 48 }: SparklineProps) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((value, i) => {
        const pct = max > 0 ? (value / max) * 100 : 0
        const opacity = 0.2 + (pct / 100) * 0.6
        return (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-300"
            style={{
              height: `${pct}%`,
              backgroundColor: color,
              opacity,
            }}
          />
        )
      })}
    </div>
  )
}
