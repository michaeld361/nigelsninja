import type { MarketPoint } from "@/lib/market";

export function MarketChart({ points }: { points: MarketPoint[] }) {
  if (!points.length) {
    return <p className="text-[15px] leading-6 text-[rgba(242,241,236,0.6)]">The chart starts when a search finishes.</p>;
  }
  const width = 600;
  const height = 220;
  const max = Math.max(1, ...points.map((point) => point.found));
  const x = (index: number) => (points.length === 1 ? width / 2 : 20 + (index / (points.length - 1)) * (width - 40));
  const y = (value: number) => 200 - (value / max) * 180;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.found).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} 200 L${x(0).toFixed(1)} 200 Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full overflow-visible" role="img" aria-label="Relevant roles found on each LinkedIn search">
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
      <div className="mt-3.5 hidden font-mono text-[11px] tracking-[0.02em] text-[rgba(242,241,236,0.55)] sm:grid" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((point) => (
          <div key={point.at} className="text-center">
            <div className="text-[#F2F1EC]">{point.label}</div>
            <div className="mt-1">{point.searched} searched</div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex gap-4 overflow-x-auto font-mono text-[11px] tracking-[0.02em] text-[rgba(242,241,236,0.55)] sm:hidden">
        {points.map((point) => (
          <div key={point.at} className="min-w-16 shrink-0 text-center">
            <div className="text-[#F2F1EC]">{point.label}</div>
            <div className="mt-1">{point.searched} searched</div>
          </div>
        ))}
      </div>
    </div>
  );
}
