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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Voting Results</h3>

      {votes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No votes yet</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-sm text-indigo-600 font-medium mb-1">
                Average
              </div>
              <div className="text-3xl font-bold text-indigo-900">
                {average}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium mb-1">
                Median
              </div>
              <div className="text-3xl font-bold text-purple-900">{median}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 mb-3">
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
                  <div className="w-16 h-20 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xl flex-shrink-0">
                    {value}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {count} vote{count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-sm text-gray-500">
                        {Math.round((count / votes.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Voters</h4>
            <div className="flex flex-wrap gap-2">
              {votes.map((vote) => (
                <div
                  key={vote.playerId}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
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
