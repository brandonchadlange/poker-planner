import { useState, useEffect, startTransition } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateGameId } from "../utils/gameUtils.js";

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

  // Check if gameId is in URL params (for direct links)
  useEffect(() => {
    const urlGameId = searchParams.get("gameId");
    if (urlGameId) {
      startTransition(() => {
        setGameId(urlGameId.toUpperCase());
        setMode("join");
      });
    }
  }, [searchParams]);

  const handleCreateGame = () => {
    if (!playerName.trim()) return;
    const newGameId = generateGameId();
    navigate(
      `/game/${newGameId}?name=${encodeURIComponent(playerName.trim())}`
    );
  };

  const handleJoinGame = () => {
    if (!playerName.trim() || !gameId.trim()) return;
    navigate(
      `/game/${gameId.toUpperCase().trim()}?name=${encodeURIComponent(
        playerName.trim()
      )}`
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-semibold text-neutral-900 mb-2 tracking-tight">
            🎯 Poker Planner
          </h1>
          <p className="text-neutral-600 text-sm">
            Real-time planning poker for agile teams
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-colors bg-white"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                if (mode === "create") {
                  handleCreateGame();
                } else {
                  handleJoinGame();
                }
              }
            }}
          />
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-neutral-100 rounded-md">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === "create"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Create Game
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === "join"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Join Game
          </button>
        </div>

        {mode === "join" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Game ID
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              placeholder="Enter game ID"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm uppercase focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-colors bg-white font-mono"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleJoinGame();
                }
              }}
            />
          </div>
        )}

        <button
          onClick={mode === "create" ? handleCreateGame : handleJoinGame}
          disabled={!playerName.trim() || (mode === "join" && !gameId.trim())}
          className="w-full bg-neutral-900 text-white py-2.5 rounded-md text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
        >
          {mode === "create" ? "Start New Game" : "Join Game"}
        </button>

        {mode === "create" && (
          <p className="text-xs text-neutral-500 text-center mt-4">
            Share the game URL with your team after creating
          </p>
        )}
      </div>
    </div>
  );
}
