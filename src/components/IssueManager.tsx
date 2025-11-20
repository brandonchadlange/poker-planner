import { useState } from "react";
import type { Issue } from "../types.js";

interface IssueManagerProps {
  issues: Issue[];
  currentIssue: Issue | null;
  isHost: boolean;
  onAddIssue: (issue: Issue) => void;
  onSelectIssue: (issue: Issue) => void;
  onStartVoting: (issue: Issue) => void;
}

export function IssueManager({
  issues,
  currentIssue,
  isHost,
  onAddIssue,
  onSelectIssue,
  onStartVoting,
}: IssueManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleAddIssue = () => {
    if (!title.trim()) return;

    const newIssue: Issue = {
      id: Math.random().toString(36).substring(2, 15),
      title: title.trim(),
      description: description.trim() || undefined,
    };

    onAddIssue(newIssue);
    setTitle("");
    setDescription("");
    setShowAddForm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Issues</h3>
        {isHost && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            {showAddForm ? "Cancel" : "+ Add Issue"}
          </button>
        )}
      </div>

      {showAddForm && isHost && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddIssue();
              }
            }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={handleAddIssue}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Issue
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {issues.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No issues yet</p>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className={`
                p-4 rounded-lg border-2 transition-all cursor-pointer
                ${
                  currentIssue?.id === issue.id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
                }
              `}
              onClick={() => isHost && onSelectIssue(issue)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {issue.title}
                  </h4>
                  {issue.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {issue.description}
                    </p>
                  )}
                  {issue.estimate !== undefined && (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                      Estimate: {issue.estimate}
                    </span>
                  )}
                </div>
                {currentIssue?.id === issue.id && (
                  <span className="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium">
                    Current
                  </span>
                )}
              </div>
              {isHost && currentIssue?.id === issue.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartVoting(issue);
                  }}
                  className="mt-2 w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Start Voting
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
