import { axisTicks, chartX, type MarketPoint } from "@/lib/market";

const WIDTH = 600;

export function MarketChart({ points }: { points: MarketPoint[] }) {
  if (!points.length) {
    return <p className="text-[15px] leading-6 text-[rgba(242,241,236,0.6)]">The chart starts when a search finishes.</p>;
  }
  const height = 220;
  const max = Math.max(1, ...points.map((point) => point.found));
  const x = (index: number) => chartX(index, points.length);
  const y = (value: number) => 200 - (value / max) * 180;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.found).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} 200 L${x(0).toFixed(1)} 200 Z`;
  const ticks = axisTicks(points);
  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="block h-auto w-full" role="img" aria-label="Relevant roles found on each LinkedIn search">
        <line x1="0" y1="200" x2="600" y2="200" stroke="rgba(242,241,236,.2)" />
        <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(242,241,236,.08)" strokeDasharray="2 4" />
        <line x1="0" y1="0" x2="600" y2="0" stroke="rgba(242,241,236,.08)" strokeDasharray="2 4" />
        <path d={area} fill="rgba(255,107,91,.08)" />
        <path d={line} fill="none" stroke="#F2F1EC" strokeWidth="1.5" strokeDasharray="1200" style={{ animation: "draw 1.6s cubic-bezier(.2,.8,.2,1) .2s both" }} />
        {points.map((point, index) => (
          <g key={point.at}>
            <circle cx={x(index)} cy={y(point.found)} r="5" fill={index === 0 ? "#FF6B5B" : "#F2F1EC"} />
            <text x={x(index)} y={Math.max(12, y(point.found) - 12)} textAnchor="middle" fill={index === 0 ? "#FF6B5B" : "#F2F1EC"} fontFamily="Geist Mono, ui-monospace, monospace" fontSize="13">
              {point.found}
            </text>
          </g>
        ))}
      </svg>
      <div className="relative mt-3 h-5 font-mono text-[11px] tracking-[0.02em]">
        {ticks.map((tick) => {
          const ratio = x(tick.index) / WIDTH;
          const edge = ratio < 0.12 ? "start" : ratio > 0.88 ? "end" : "middle";
          return (
            <div
              key={`${tick.index}-${tick.label}`}
              className="absolute top-0 whitespace-nowrap text-[#F2F1EC]"
              style={{
                left: edge === "end" ? undefined : edge === "start" ? 0 : `${ratio * 100}%`,
                right: edge === "end" ? 0 : undefined,
                transform: edge === "middle" ? "translateX(-50%)" : undefined,
              }}
            >
              {tick.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
