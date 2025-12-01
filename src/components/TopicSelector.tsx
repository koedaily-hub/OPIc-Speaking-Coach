"use client";

import React, { useState, useEffect, useRef } from "react";

interface Topic {
  id: string;
  name: string;
  emoji?: string;
}

interface TopicSelectorProps {
  value: string;
  onChange: (value: string) => void;
  topics: Topic[];
}

export default function TopicSelector({
  value,
  onChange,
  topics,
}: TopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTopic = topics.find((t) => t.id === value);

  const filteredTopics = topics.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  /** Close dropdown when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="mb-4 relative">
      <label className="block text-base font-semibold mb-1 text-gray-700">
        Choose a topic
      </label>

      {/* Selected Box */}
      <button
        className="w-full p-3 border rounded-lg bg-white text-left flex items-center justify-between shadow-sm"
        onClick={() => setOpen(!open)}
      >
        <span>
          {selectedTopic?.emoji && <span>{selectedTopic.emoji} </span>}
          {selectedTopic?.name}
        </span>

        <span className="text-gray-500">▾</span>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-72 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topic..."
              className="w-full p-2 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* List */}
          <ul className="max-h-60 overflow-y-auto">
            {filteredTopics.length === 0 && (
              <li className="p-3 text-gray-500 text-center">No topics found</li>
            )}

            {filteredTopics.map((t) => (
              <li
                key={t.id}
                className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
                onClick={() => handleSelect(t.id)}
              >
                {t.emoji && <span>{t.emoji}</span>}
                <span>{t.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
