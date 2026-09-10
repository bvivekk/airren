import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DraftContent,
  DraftPatch,
  HostListing,
  ListingContent,
  ListingField,
  ListingId,
  ListingIssue,
  ListingOption,
  ListingOptions,
  ListingPhoto,
  ListingSnapshot,
  ListingStatus,
  PublishOutcome,
  PublishReadiness,
} from "../domain/listing.ts";
import { LISTING_STATUSES } from "../domain/listing.ts";
import { resolveStoragePhotoSrc, STORAGE_SRC_PREFIX } from "./photo-src.ts";

const LISTING_FIELDS = [
  "name",
  "type",
  "city",
  "region",
  "country",
  "beds",
  "baths",
  "guests",
  "nightlyRatePaise",
  "description",
  "photos",
] as const satisfies readonly ListingField[];

const UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`listing ${field} must be a string`);
  }
  return value;
}

function asNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`listing ${field} must be a string`);
  }
  return value.length === 0 ? null : value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`listing ${field} must be a number`);
}

function asNullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return asNumber(value, field);
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`listing ${field} must be a string array`);
  }
  return value;
}

function parseStatus(value: string): ListingStatus {
  if ((LISTING_STATUSES as readonly string[]).includes(value)) {
    return value as ListingStatus;
  }
  throw new Error(`unknown listing status: ${value}`);
}

function parsePhoto(value: unknown): ListingPhoto {
  if (!isRecord(value)) {
    throw new Error("listing photo must be an object");
  }
  const src = asString(value.src, "photo.src");
  return {
    id: asString(value.id, "photo.id"),
    src: src.startsWith(STORAGE_SRC_PREFIX) ? resolveStoragePhotoSrc(src) : src,
    alt: asString(value.alt, "photo.alt"),
  };
}

function parsePhotos(value: unknown): ListingPhoto[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("listing photos must be an array");
  }
  return value.map(parsePhoto);
}

function parseDraftContent(value: unknown): DraftContent {
  if (!isRecord(value)) {
    throw new Error("listing content must be an object");
  }
  const location = isRecord(value.location) ? value.location : {};
  return {
    name: asNullableString(value.name, "name"),
    type: asNullableString(value.type, "type"),
    location: {
      city: asNullableString(location.city, "city"),
      region: asNullableString(location.region, "region"),
      country: asNullableString(location.country, "country"),
    },
    beds: asNullableNumber(value.beds, "beds"),
    baths: asNullableNumber(value.baths, "baths"),
    guests: asNullableNumber(value.guests, "guests"),
    nightlyRatePaise: asNullableNumber(value.nightlyRatePaise, "nightlyRatePaise"),
    description: asNullableString(value.description, "description"),
    amenities: Array.isArray(value.amenities) ? asStringArray(value.amenities, "amenities") : [],
    photos: parsePhotos(value.photos),
  };
}

function parseListingContent(value: unknown): ListingContent {
  const draft = parseDraftContent(value);
  if (
    draft.name === null ||
    draft.type === null ||
    draft.location.city === null ||
    draft.location.region === null ||
    draft.location.country === null ||
    draft.beds === null ||
    draft.baths === null ||
    draft.guests === null ||
    draft.nightlyRatePaise === null ||
    draft.description === null
  ) {
    throw new Error("listing content is incomplete");
  }
  return {
    name: draft.name,
    type: draft.type,
    location: {
      city: draft.location.city,
      region: draft.location.region,
      country: draft.location.country,
    },
    beds: draft.beds,
    baths: draft.baths,
    guests: draft.guests,
    nightlyRatePaise: draft.nightlyRatePaise,
    description: draft.description,
    amenities: draft.amenities,
    photos: draft.photos,
  };
}

function parseListingField(value: unknown): ListingField {
  if (typeof value === "string" && (LISTING_FIELDS as readonly string[]).includes(value)) {
    return value as ListingField;
  }
  throw new Error(`unknown listing field: ${String(value)}`);
}

function parseIssue(value: unknown): ListingIssue {
  if (!isRecord(value)) {
    throw new Error("listing issue must be an object");
  }
  return {
    field: parseListingField(value.field),
    message: asString(value.message, "issue.message"),
  };
}

export function parseIssues(value: unknown): ListingIssue[] {
  const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(parsed)) {
    throw new Error("listing issues must be an array");
  }
  return parsed.map(parseIssue);
}

function parseReadiness(value: unknown): PublishReadiness {
  if (!isRecord(value)) {
    throw new Error("listing readiness must be an object");
  }
  if (value.ready === true) {
    return { ready: true, content: parseListingContent(value.content) };
  }
  if (value.ready === false) {
    return { ready: false, issues: parseIssues(value.issues) };
  }
  throw new Error("listing readiness must set ready");
}

function parseListing(value: unknown): HostListing {
  if (!isRecord(value)) {
    throw new Error("listing must be an object");
  }
  const status = parseStatus(asString(value.status, "status"));
  const id = asString(value.id, "id");
  const slug = asString(value.slug, "slug");
  const updatedAt = asString(value.updatedAt, "updatedAt");
  switch (status) {
    case "draft":
      return {
        status,
        id,
        slug,
        content: parseDraftContent(value.content),
        updatedAt,
      };
    case "published":
    case "unlisted":
      return {
        status,
        id,
        slug,
        content: parseListingContent(value.content),
        publishedAt: asString(value.publishedAt, "publishedAt"),
        updatedAt,
      };
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function parseSnapshot(value: unknown): ListingSnapshot {
  if (!isRecord(value)) {
    throw new Error("listing snapshot must be an object");
  }
  return {
    listing: parseListing(value.listing),
    readiness: parseReadiness(value.readiness),
  };
}

function normalizePatch(patch: DraftPatch): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  const textKeys = ["name", "type", "city", "region", "country", "description"] as const;
  for (const key of textKeys) {
    const value = patch[key];
    if (value === undefined) {
      continue;
    }
    next[key] = value.trim();
  }
  const numberKeys = ["beds", "baths", "guests", "nightlyRatePaise"] as const;
  for (const key of numberKeys) {
    const value = patch[key];
    if (value === undefined) {
      continue;
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
    next[key] = value;
  }
  if (patch.amenities !== undefined) {
    next.amenities = patch.amenities;
  }
  if (patch.photos !== undefined) {
    next.photos = patch.photos;
  }
  return next;
}

function assertUploadable(file: File): void {
  if (!UPLOAD_TYPES.has(file.type)) {
    throw new Error("photo must be a jpeg, png, or webp");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("photo must be 8 MB or smaller");
  }
}

function uploadExtension(file: File): string {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("photo must be a jpeg, png, or webp");
  }
}

function rpcError(error: { message?: string }): Error {
  return new Error(error.message || "listing request failed");
}

export async function listMyListings(client: SupabaseClient): Promise<ListingSnapshot[]> {
  const { data, error } = await client.rpc("my_listings");
  if (error) {
    throw rpcError(error);
  }
  if (!Array.isArray(data)) {
    throw new Error("my_listings must return an array");
  }
  return data.map(parseSnapshot);
}

export async function getMyListing(
  client: SupabaseClient,
  id: ListingId,
): Promise<ListingSnapshot | undefined> {
  const { data, error } = await client.rpc("my_listings", { p_listing_id: id });
  if (error) {
    throw rpcError(error);
  }
  if (!Array.isArray(data) || data.length === 0) {
    return undefined;
  }
  return parseSnapshot(data[0]);
}

export async function startListingDraft(client: SupabaseClient): Promise<ListingSnapshot> {
  const { data, error } = await client.rpc("create_listing_draft");
  if (error) {
    throw rpcError(error);
  }
  return parseSnapshot(data);
}

export async function saveListingDraft(
  client: SupabaseClient,
  id: ListingId,
  patch: DraftPatch,
): Promise<ListingSnapshot> {
  const { data, error } = await client.rpc("save_listing_draft", {
    p_listing_id: id,
    p_patch: normalizePatch(patch),
  });
  if (error) {
    throw rpcError(error);
  }
  return parseSnapshot(data);
}

export async function publishListing(client: SupabaseClient, id: ListingId): Promise<PublishOutcome> {
  const { data, error } = await client.rpc("publish_listing", { p_listing_id: id });
  if (error) {
    if (error.code === "P0001" && error.message === "listing incomplete") {
      return { published: false, issues: parseIssues(error.details) };
    }
    throw rpcError(error);
  }
  return { published: true, snapshot: parseSnapshot(data) };
}

export async function unlistListing(client: SupabaseClient, id: ListingId): Promise<ListingSnapshot> {
  const { data, error } = await client.rpc("unlist_listing", { p_listing_id: id });
  if (error) {
    throw rpcError(error);
  }
  return parseSnapshot(data);
}

export async function attachListingPhoto(
  client: SupabaseClient,
  id: ListingId,
  file: File,
  alt: string,
): Promise<ListingSnapshot> {
  assertUploadable(file);
  const { data: hostId, error: hostError } = await client.rpc("listing_jwt_sub");
  if (hostError) {
    throw rpcError(hostError);
  }
  if (typeof hostId !== "string" || hostId.length === 0) {
    throw new Error("signed in host required");
  }
  const path = `${hostId}/${id}/${crypto.randomUUID()}.${uploadExtension(file)}`;
  const uploaded = await client.storage.from("listing-photos").upload(path, file, {
    contentType: file.type,
  });
  if (uploaded.error) {
    throw new Error(uploaded.error.message);
  }
  const { data, error } = await client.rpc("attach_listing_photo", {
    p_listing_id: id,
    p_storage_path: path,
    p_alt: alt,
  });
  if (error) {
    await client.storage.from("listing-photos").remove([path]);
    throw rpcError(error);
  }
  return parseSnapshot(data);
}

function parseOptionKind(value: string): ListingOption["kind"] {
  switch (value) {
    case "type":
    case "amenity":
      return value;
    default:
      throw new Error(`unknown listing option kind: ${value}`);
  }
}

export async function loadListingOptions(client: SupabaseClient): Promise<ListingOptions> {
  const { data, error } = await client.from("listing_options").select("kind, value, label").order("sort_order");
  if (error) {
    throw rpcError(error);
  }
  const types: ListingOption[] = [];
  const amenities: ListingOption[] = [];
  for (const row of data ?? []) {
    if (!isRecord(row)) {
      throw new Error("listing option must be an object");
    }
    const option: ListingOption = {
      kind: parseOptionKind(asString(row.kind, "kind")),
      value: asString(row.value, "value"),
      label: asString(row.label, "label"),
    };
    switch (option.kind) {
      case "type":
        types.push(option);
        break;
      case "amenity":
        amenities.push(option);
        break;
      default: {
        const _never: never = option.kind;
        throw new Error(`unhandled listing option kind: ${_never}`);
      }
    }
  }
  return { types, amenities };
}
