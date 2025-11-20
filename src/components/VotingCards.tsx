interface VotingCardsProps {
  sequence: (number | string)[];
  onVote: (value: number | string) => void;
  currentVote: number | string | null;
  votesRevealed: boolean;
}

export function VotingCards({
  sequence,
  onVote,
  currentVote,
  votesRevealed,
}: VotingCardsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {sequence.map((value, index) => {
        const isSelected = currentVote === value;
        const displayValue =
          value === "?" ? "?" : value === "☕" ? "☕" : value;

        return (
          <button
            key={index}
            onClick={() => !votesRevealed && onVote(value)}
            disabled={votesRevealed}
            className={`
              w-20 h-28 rounded-lg font-bold text-xl transition-all transform
              ${
                isSelected
                  ? "bg-indigo-600 text-white scale-110 shadow-lg ring-4 ring-indigo-300"
                  : "bg-white text-gray-800 hover:bg-indigo-50 hover:scale-105 shadow-md"
              }
              ${
                votesRevealed
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-lg"
              }
            `}
          >
            {displayValue}
          </button>
        );
      })}
    </div>
  );
}
