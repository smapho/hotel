"use client";

import { useState } from "react";

export default function PlanContents({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  return (
    <div className="mt-2 text-sm text-black/70 dark:text-white/70">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        {expanded ? "プラン詳細を閉じる" : "プラン詳細を見る"}
      </button>
      {expanded && <p className="mt-1 whitespace-pre-wrap">{text}</p>}
    </div>
  );
}
