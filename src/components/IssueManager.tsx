import { useState } from "react";
import type { Issue } from "../types.js";

interface IssueManagerProps {
  issues: Issue[];
  currentIssue: Issue | null;
  onAddIssue: (issue: Issue) => void;
  onSelectIssue: (issue: Issue) => void;
  onStartVoting: (issue: Issue) => void;
}

export function IssueManager({
  issues,
  currentIssue,
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
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
          Issues
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors text-xs font-medium"
        >
          {showAddForm ? "Cancel" : "+ Add Issue"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-neutral-50 rounded-md border border-neutral-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-colors bg-white"
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-md mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-colors bg-white resize-none"
          />
          <button
            onClick={handleAddIssue}
            className="w-full px-3 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors text-sm font-medium"
          >
            Add Issue
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {issues.length === 0 ? (
          <p className="text-neutral-500 text-center py-8 text-sm">
            No issues yet
          </p>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className={`
                p-3 rounded-md border transition-all cursor-pointer
                ${
                  currentIssue?.id === issue.id
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                }
              `}
              onClick={() => onSelectIssue(issue)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-900 mb-1 text-sm">
                    {issue.title}
                  </h4>
                  {issue.description && (
                    <p className="text-xs text-neutral-600 mb-2">
                      {issue.description}
                    </p>
                  )}
                  {issue.estimate !== undefined && (
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-medium border border-emerald-200">
                      Estimate: {issue.estimate}
                    </span>
                  )}
                </div>
                {currentIssue?.id === issue.id && (
                  <span className="ml-2 px-1.5 py-0.5 bg-neutral-900 text-white rounded text-xs font-medium">
                    Current
                  </span>
                )}
              </div>
              {currentIssue?.id === issue.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartVoting(issue);
                  }}
                  className="mt-2 w-full px-3 py-1.5 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors text-xs font-medium"
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
