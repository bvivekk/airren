import assert from "node:assert/strict";
import test from "node:test";
import { addDaysIso, defaultStayWindow, nightsBetween } from "./dates.ts";

test("nightsBetween counts whole nights", () => {
  assert.equal(nightsBetween("2026-10-01", "2026-10-04"), 3);
});

test("defaultStayWindow is three nights", () => {
  const stay = defaultStayWindow();
  assert.equal(nightsBetween(stay.checkIn, stay.checkOut), 3);
  assert.equal(stay.checkOut, addDaysIso(stay.checkIn, 3));
});
