import { MarketChart } from "@/components/market-chart";
import { marketView, type MarketBar } from "@/lib/market";
import { loadStore } from "@/lib/store";

export default function MarketPage() {
  const store = loadStore();
  const view = marketView(store);
  const live = Boolean(process.env.APIFY_TOKEN);
  const searches = store.runs.filter((run) => run.finishedAt && (live ? !run.counts.linkedin?.demo : true)).length;
  const suggestion = view.read.length > 1 ? view.read[view.read.length - 1] : null;
  const lead = suggestion ? view.read.slice(0, -1) : view.read;
  return (
    <div className="rise">
      <div className="eyebrow">Market · {searches} {searches === 1 ? "search" : "searches"}</div>
      <h1 className="display mt-3.5 text-[clamp(64px,9vw,112px)]">
        What the search <em className="text-[#FF6B5B] italic">actually</em> found
      </h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        Not another job list. A quiet look at the privacy roles this search has found, and what that suggests for your CV.
      </p>

      <section className="mt-16 grid grid-cols-1 gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)] md:gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">Relevant roles</h2>
          <p className="mt-3 text-[15px] leading-[1.5] text-[rgba(242,241,236,0.6)]">{view.historyNote}</p>
        </div>
        <MarketChart points={view.points} />
      </section>

      <section className="mt-14 grid grid-cols-1 gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">Where they sit</h2>
        {view.places.length ? (
          <Bars items={view.places} />
        ) : (
          <p className="text-[17px] leading-7">No kept roles yet, so there is nowhere to place them.</p>
        )}
      </section>

      <section className="mt-14 grid grid-cols-1 gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">What keeps appearing</h2>
        <div className="flex flex-col gap-9">
          <div>
            <div className="eyebrow mb-3.5 text-[10.5px]">Titles</div>
            {view.repeating.length ? (
              <Bars items={view.repeating} />
            ) : (
              <p className="text-[17px] leading-7">No title has come back twice yet. One search is too thin for a pattern.</p>
            )}
          </div>
          {view.asks.length ? (
            <div>
              <div className="eyebrow mb-3.5 text-[10.5px]">In the specs we have fetched</div>
              <Bars items={view.asks} coral={(item) => item.label === "A practising lawyer"} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">What this suggests</h2>
        <div className="flex max-w-[58ch] flex-col gap-[18px] text-[18.5px] leading-[1.55] text-[rgba(242,241,236,0.85)]">
          {lead.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="m-0">
              {paragraph}
            </p>
          ))}
          {suggestion ? (
            <p className="m-0 bg-[#F2F1EC] p-6 font-[family-name:var(--font-display)] text-2xl leading-[1.3] font-bold text-[#0E0F11]">{suggestion}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Bars({ items, coral }: { items: MarketBar[]; coral?: (item: MarketBar) => boolean }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => {
        const hot = coral?.(item) ?? false;
        return (
          <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-4">
            <div>
              <div className="text-[17px]" style={{ color: hot ? "#FF6B5B" : "#F2F1EC" }}>
                {item.label}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-sm bg-[rgba(242,241,236,0.08)]">
                <div className="bar-grow h-full" style={{ width: `${(item.count / max) * 100}%`, background: hot ? "#FF6B5B" : "#F2F1EC" }} />
              </div>
            </div>
            <div className="text-right font-mono text-sm">{item.count}</div>
          </div>
        );
      })}
    </div>
  );
}
