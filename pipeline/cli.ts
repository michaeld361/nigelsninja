import { runPipeline } from "./run";

async function main() {
  const result = await runPipeline({ trigger: "cron", by: "cli" });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      id: result.run.id,
      fetched: result.run.totals.fetched,
      new: result.run.totals.new,
      letters: result.run.totals.letters,
      cost: result.run.estimatedCostUsd,
      warnings: result.run.warnings.length,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});