export type RepullFailure = "untrusted" | "invalid" | "retryable";

export class RepullError extends Error {
  readonly kind: RepullFailure;

  constructor(kind: RepullFailure, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function isRepullError(error: unknown): error is RepullError {
  return error instanceof RepullError;
}
