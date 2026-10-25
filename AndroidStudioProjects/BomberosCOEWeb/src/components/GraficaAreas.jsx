import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { colorArea } from "../areas"

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-sm shadow-card">
        <p className="text-tactical-text font-bold">{payload[0].payload.name}</p>
        <p className="text-tactical-red font-semibold">{payload[0].value} reportes</p>
      </div>
    )
  }
  return null
}

export default function GraficaAreas({ reportes }) {
  const conteo = {}
  reportes.forEach(r => {
    const area = r.area || "Sin área"
    conteo[area] = (conteo[area] || 0) + 1
  })
  const data = Object.entries(conteo)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-tactical-muted text-sm">
        Sin datos aún
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--t-muted)", fontSize: 10, fontFamily: "Inter" }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fill: "var(--t-muted)", fontSize: 11 }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(128, 128, 128, 0.08)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map(d => (
            <Cell key={d.name} fill={colorArea(d.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
