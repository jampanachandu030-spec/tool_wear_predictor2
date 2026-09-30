import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Simulated wear progression for three tools under different cutting regimes.
export function WearChart() {
  const data = useMemo(() => {
    const points = [];
    for (let t = 0; t <= 240; t += 10) {
      const toolA = 0.3 * (1 - Math.exp(-t / 95)) + 0.0004 * t;
      const toolB = 0.3 * (1 - Math.exp(-t / 150)) + 0.0002 * t;
      const toolC = 0.3 * (1 - Math.exp(-t / 60)) + 0.0009 * t;
      points.push({
        time: t,
        "Tool A — finishing": Number(toolA.toFixed(3)),
        "Tool B — roughing": Number(toolB.toFixed(3)),
        "Tool C — high speed": Number(toolC.toFixed(3)),
      });
    }
    return points;
  }, []);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.16 155)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.72 0.16 155)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.63 0.22 25)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.63 0.22 25)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(0.3 0.018 250)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="oklch(0.65 0.02 250)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}m`}
          />
          <YAxis
            stroke="oklch(0.65 0.02 250)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
            domain={[0, 0.45]}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.2 0.014 250)",
              border: "1px solid oklch(0.3 0.018 250)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "oklch(0.93 0.01 240)" }}
            labelFormatter={(v) => `Cutting time: ${v} min`}
          />
          <ReferenceLine
            y={0.3}
            stroke="oklch(0.63 0.22 25)"
            strokeDasharray="6 4"
            label={{ value: "VB limit 0.30", position: "insideTopRight", fill: "oklch(0.63 0.22 25)", fontSize: 11 }}
          />
          <Area type="monotone" dataKey="Tool A — finishing" stroke="oklch(0.78 0.16 75)" strokeWidth={2} fill="url(#gA)" />
          <Area type="monotone" dataKey="Tool B — roughing" stroke="oklch(0.72 0.16 155)" strokeWidth={2} fill="url(#gB)" />
          <Area type="monotone" dataKey="Tool C — high speed" stroke="oklch(0.63 0.22 25)" strokeWidth={2} fill="url(#gC)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
