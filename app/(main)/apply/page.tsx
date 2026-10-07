import Link from "next/link";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { loadStore } from "@/lib/store";

export default function ApplyPage() {
  const store = loadStore();
  const packs = [...store.applyPacks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const preparing = packs.some((pack) => pack.state === "preparing");
  return (
    <div>
      <RefreshWhilePreparing preparing={preparing} />
      <h1 className="font-serif text-5xl tracking-tight">Apply list</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
        Roles you want to apply for. Each one gets a letter, how to apply, a contact, and a note on the company.
      </p>
      {packs.length === 0 ? (
        <p className="mt-16 max-w-xl font-serif text-3xl leading-snug tracking-tight">
          Nothing here yet. When a role is worth applying for, add it from Jobs.
        </p>
      ) : (
        <ul className="mt-12">
          {packs.map((pack) => {
            const job = store.jobs.find((item) => item.id === pack.jobId);
            if (!job) return null;
            return (
              <li key={pack.id} className="border-t py-8">
                <Link href={`/apply/${job.id}`} className="block">
                  <h2 className="font-serif text-3xl tracking-tight">{job.company}</h2>
                  <p className="mt-1 text-lg">{job.title}</p>
                  <p className="mt-3 text-sm text-muted-foreground" aria-live="polite" aria-busy={pack.state === "preparing"}>
                    {pack.state === "preparing" ? (
                      <PreparingLine />
                    ) : pack.state === "failed" ? (
                      "This one did not finish."
                    ) : (
                      "Letter, how to apply, and a company note are ready."
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
