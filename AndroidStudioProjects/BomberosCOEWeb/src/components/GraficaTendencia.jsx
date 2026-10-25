import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-sm shadow-card">
        <p className="text-tactical-muted font-semibold">{payload[0].payload.fecha}</p>
        <p className="text-tactical-red font-bold">{payload[0].value} reportes</p>
      </div>
    )
  }
  return null
}

export default function GraficaTendencia({ reportes }) {
  const conteo = {}
  reportes.forEach(r => {
    const fecha = r.fecha || "Sin fecha"
    conteo[fecha] = (conteo[fecha] || 0) + 1
  })

  const data = Object.entries(conteo)
    .map(([fecha, value]) => ({ fecha, value }))
    .sort((a, b) => {
      const [da, ma, ya] = a.fecha.split("-").map(Number)
      const [db, mb, yb] = b.fecha.split("-").map(Number)
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db)
    })
    .slice(-30)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-tactical-muted text-sm">
        Sin datos aún
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" />
        <XAxis
          dataKey="fecha"
          tick={{ fill: "var(--t-muted)", fontSize: 9, fontFamily: "Inter" }}
          angle={-35}
          textAnchor="end"
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: "var(--t-muted)", fontSize: 11 }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--t-red)"
          strokeWidth={2.5}
          dot={{ fill: "var(--t-red)", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
