import { fetchGreenhouseCandidates } from "./sources/greenhouse.mjs";

const boards = [...new Set(process.argv.slice(2))];
if (boards.length === 0) {
  console.error("Usage: node scripts/discover-jobs.mjs <greenhouse-board-token> [...]");
  process.exitCode = 1;
} else {
  const results = [];
  for (const board of boards) {
    try {
      results.push(await fetchGreenhouseCandidates(board));
    } catch (error) {
      results.push({ board, error: error instanceof Error ? error.message : "Board unavailable" });
      process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(results, null, 2));
}
