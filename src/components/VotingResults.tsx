import type { Vote } from "../types.js";
import { calculateAverage, calculateMedian } from "../utils/gameUtils.js";

interface VotingResultsProps {
  votes: Vote[];
}

export function VotingResults({ votes }: VotingResultsProps) {
  const numericVotes = votes
    .filter((v) => v.value !== null && typeof v.value === "number")
    .map((v) => v.value as number);

  const average = numericVotes.length > 0 ? calculateAverage(numericVotes) : 0;
  const median = numericVotes.length > 0 ? calculateMedian(numericVotes) : 0;

  const voteCounts: Record<string, number> = {};
  votes.forEach((vote) => {
    const key =
      vote.value === null
        ? "?"
        : vote.value === "☕"
        ? "☕"
        : String(vote.value);
    voteCounts[key] = (voteCounts[key] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(voteCounts), 0);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-6 tracking-tight">
        Voting Results
      </h3>

      {votes.length === 0 ? (
        <p className="text-neutral-500 text-center py-8 text-sm">
          No votes yet
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-neutral-50 rounded-md border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 font-medium mb-1">
                Average
              </div>
              <div className="text-2xl font-semibold text-neutral-900">
                {average}
              </div>
            </div>
            <div className="bg-neutral-50 rounded-md border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 font-medium mb-1">
                Median
              </div>
              <div className="text-2xl font-semibold text-neutral-900">
                {median}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-neutral-900 mb-3 text-sm">
              Individual Votes
            </h4>
            {Object.entries(voteCounts)
              .sort((a, b) => {
                if (a[0] === "?") return 1;
                if (b[0] === "?") return -1;
                if (a[0] === "☕") return 1;
                if (b[0] === "☕") return -1;
                return Number(a[0]) - Number(b[0]);
              })
              .map(([value, count]) => (
                <div key={value} className="flex items-center gap-3">
                  <div className="w-14 h-16 bg-neutral-900 text-white rounded-md flex items-center justify-center font-semibold text-base flex-shrink-0">
                    {value}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-700">
                        {count} vote{count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {Math.round((count / votes.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div
                        className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <h4 className="font-medium text-neutral-900 mb-3 text-sm">
              Voters
            </h4>
            <div className="flex flex-wrap gap-2">
              {votes.map((vote) => (
                <div
                  key={vote.playerId}
                  className="px-2.5 py-1 bg-neutral-100 rounded-md text-xs text-neutral-700 border border-neutral-200"
                >
                  {vote.playerName}:{" "}
                  {vote.value === null
                    ? "?"
                    : vote.value === "☕"
                    ? "☕"
                    : vote.value}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
