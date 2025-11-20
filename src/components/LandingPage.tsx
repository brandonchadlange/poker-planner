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
      `/game/${newGameId}?name=${encodeURIComponent(
        playerName.trim()
      )}&host=true`
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 Poker Planner
          </h1>
          <p className="text-gray-600">
            Real-time planning poker for agile teams
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === "create"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Create Game
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === "join"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Join Game
          </button>
        </div>

        {mode === "join" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game ID
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              placeholder="Enter game ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
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
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {mode === "create" ? "Start New Game" : "Join Game"}
        </button>

        {mode === "create" && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Share the game URL with your team after creating
          </p>
        )}
      </div>
    </div>
  );
}
