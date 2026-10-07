import { MarketChart } from "@/components/market-chart";
import { marketView } from "@/lib/market";
import { loadStore } from "@/lib/store";

export default function MarketPage() {
  const view = marketView(loadStore());
  return (
    <div>
      <h1 className="font-serif text-5xl tracking-tight">Market</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
        Not another job list. A quiet look at the privacy roles this search has actually found, and what that suggests for your CV.
      </p>
      <section className="mt-16 border-t pt-12">
        <h2 className="font-serif text-3xl tracking-tight">Relevant roles</h2>
        <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{view.historyNote}</p>
        <MarketChart points={view.points} />
        {view.points.length ? (
          <ul className="mt-4 max-w-xl space-y-1 text-sm text-muted-foreground">
            {view.points.map((point) => (
              <li key={point.at}>
                {point.label}. {point.searched} searched, {point.found} found.
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="mt-28 border-t pt-16">
        <h2 className="font-serif text-3xl tracking-tight">Where they sit</h2>
        {view.places.length ? (
          <ul className="mt-8 max-w-xl space-y-3 text-base leading-8">
            {view.places.map((place) => (
              <li key={place.label} className="flex items-baseline justify-between gap-6 border-b pb-3">
                <span>{place.label}</span>
                <span className="text-muted-foreground">{place.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 max-w-xl text-base leading-8">No kept roles yet, so there is nowhere to place them.</p>
        )}
      </section>
      <section className="mt-28 border-t pt-16">
        <h2 className="font-serif text-3xl tracking-tight">What keeps appearing</h2>
        <div className="mt-8 max-w-xl space-y-10">
          {view.repeating.length ? (
            <ul className="space-y-3 text-base leading-8">
              {view.repeating.map((item) => (
                <li key={item.label} className="flex items-baseline justify-between gap-6 border-b pb-3">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base leading-8">No title has come back twice yet. One search is too thin for a pattern.</p>
          )}
          {view.asks.length ? (
            <div>
              <p className="text-sm text-muted-foreground">In the specs we have fetched</p>
              <ul className="mt-4 space-y-3 text-base leading-8">
                {view.asks.map((ask) => (
                  <li key={ask.label} className="flex items-baseline justify-between gap-6 border-b pb-3">
                    <span>{ask.label}</span>
                    <span className="text-muted-foreground">{ask.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
      <section className="mt-28 border-t pt-16">
        <h2 className="font-serif text-3xl tracking-tight">What this suggests</h2>
        <div className="mt-8 max-w-xl space-y-4 text-base leading-8">
          {view.read.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
