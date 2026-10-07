import type { MarketPoint } from "@/lib/market";

export function MarketChart({ points }: { points: MarketPoint[] }) {
  if (!points.length) {
    return <p className="mt-8 max-w-xl text-base leading-8">The chart starts when a search finishes.</p>;
  }
  const width = 640;
  const height = 220;
  const pad = { left: 28, right: 12, top: 16, bottom: 28 };
  const max = Math.max(1, ...points.map((point) => point.found));
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (index: number) => (points.length === 1 ? pad.left + innerW / 2 : pad.left + (index / (points.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.found).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-8 w-full text-foreground" role="img" aria-label="Relevant roles found on each LinkedIn search">
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="currentColor" strokeOpacity="0.2" />
      <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="currentColor" strokeOpacity="0.2" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {points.map((point, index) => (
        <g key={point.at}>
          <circle cx={x(index)} cy={y(point.found)} r="4" fill="currentColor" />
          <text x={x(index)} y={y(point.found) - 10} textAnchor="middle" fill="currentColor" fontSize="12">
            {point.found}
          </text>
        </g>
      ))}
    </svg>
  );
}
