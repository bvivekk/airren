"use client";

import { useState } from "react";

export function ListApplyForm() {
  const [done, setDone] = useState(false);
  const [url, setUrl] = useState("");

  if (done) {
    return (
      <p className="rounded-3xl bg-white px-6 py-8 text-center text-sm">
        Application received. We will review the home. Nothing was saved on a server.
      </p>
    );
  }

  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setDone(true);
      }}
    >
      <input
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Airbnb, Vrbo, or site URL"
        className="rounded-full border border-line bg-white px-5 py-3 text-sm outline-none"
      />
      <button type="submit" className="rounded-full bg-foreground py-3 text-sm font-medium text-white">
        List on Airren
      </button>
    </form>
  );
}
