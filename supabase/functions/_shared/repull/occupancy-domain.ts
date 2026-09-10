declare const isoDateBrand: unique symbol;
declare const stayBrand: unique symbol;

export type IsoDate = string & { readonly [isoDateBrand]: true };
export type Stay = { readonly from: IsoDate; readonly to: IsoDate; readonly [stayBrand]: true };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isoDate(value: string): IsoDate | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    return null;
  }
  return value as IsoDate;
}

export function stay(from: string, to: string): Stay | null {
  const start = isoDate(from);
  const end = isoDate(to);
  if (start === null || end === null || end <= start) {
    return null;
  }
  return { from: start, to: end } as Stay;
}
