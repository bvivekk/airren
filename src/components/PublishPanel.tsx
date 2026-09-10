"use client";

import type { ListingSnapshot, PublishOutcome } from "@/domain/listing";

export function PublishPanel({
  snapshot,
  pending,
  error,
  onPublish,
  onUnlist,
}: {
  snapshot: ListingSnapshot;
  pending: boolean;
  error: string;
  onPublish: () => void;
  onUnlist: () => void;
}) {
  const { listing, readiness } = snapshot;
  const issueCount = readiness.ready ? 0 : readiness.issues.length;

  return (
    <aside className="rounded-3xl border border-line bg-white p-5">
      <p className="text-sm font-semibold">
        {listing.status === "published"
          ? "This listing is live."
          : listing.status === "unlisted"
            ? "This listing is unlisted."
            : readiness.ready
              ? "Ready to publish."
              : `${issueCount} ${issueCount === 1 ? "thing" : "things"} to finish`}
      </p>
      {readiness.ready ? null : (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          {readiness.issues.map((issue) => (
            <li key={issue.field}>{issue.message}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {listing.status === "published" ? (
          <button
            type="button"
            disabled={pending}
            className="rounded-full border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            onClick={onUnlist}
          >
            Unlist
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || !readiness.ready}
            className="rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            onClick={onPublish}
          >
            Publish
          </button>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
    </aside>
  );
}

export function publishErrorMessage(outcome: PublishOutcome): string {
  if (outcome.published) {
    return "";
  }
  return outcome.issues[0]?.message ?? "This listing is not ready to publish.";
}
