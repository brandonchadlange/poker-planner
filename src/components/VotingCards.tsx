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
    <div className="flex flex-wrap gap-2 justify-center">
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
              w-16 h-20 rounded-md font-semibold text-lg transition-all
              ${
                isSelected
                  ? "bg-neutral-900 text-white border-2 border-neutral-900 shadow-md"
                  : "bg-white text-neutral-900 border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 shadow-sm"
              }
              ${
                votesRevealed
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
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
