"use client";

import { useState } from "react";

const REPLIES: { match: string; reply: string }[] = [
  { match: "book", reply: "Pick dates on a home and hit Reserve. This demo never charges a card." },
  { match: "wifi", reply: "The house tablet has the Wi-Fi name and password on the home screen." },
  { match: "check", reply: "Arrival is 4pm. Checkout has no chores. Leave the keys in the door." },
  { match: "help", reply: "The help center is at /help. I can also take a note for concierge." },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ from: "guest" | "airren"; text: string }[]>([
    { from: "airren", text: "Hi. Concierge is here. Ask about booking, Wi-Fi, or checkout." },
  ]);

  function send() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const lower = text.toLowerCase();
    const hit = REPLIES.find((row) => lower.includes(row.match));
    const reply = hit?.reply ?? "Got it. A person would pick this up on a live trip. Try the help center for now.";
    setMessages((current) => [
      ...current,
      { from: "guest", text },
      { from: "airren", text: reply },
    ]);
    setDraft("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div className="mb-3 flex h-80 w-[320px] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Airren concierge</div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
            {messages.map((message, index) => (
              <p
                key={`${message.from}-${index}`}
                className={message.from === "guest" ? "text-right text-foreground" : "text-muted"}
              >
                {message.text}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message"
              className="flex-1 rounded-full bg-pill px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="rounded-full bg-foreground px-3 py-2 text-xs font-medium text-white">
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Open chat"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.16)]"
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H9l-4 3.5V6.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
