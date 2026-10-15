import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Booking } from "../../domain/booking.ts";
import {
  readCheckoutCommand,
  resumeStayCheckout,
  startStayCheckout,
  submitClaimedRefund,
  verifyStayPayment,
  type PaymentGateway,
} from "./flow.ts";
import type { GatewayOrder, GatewayPayment, GatewayRefund } from "./types.ts";

const bookingId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: bookingId,
    homeId,
    homeName: "Sterling Canopy",
    homeSlug: "sterling-canopy",
    guestId: "user_abc",
    checkIn: "2026-11-01",
    checkOut: "2026-11-04",
    guests: 2,
    nights: 3,
    subtotalPaise: 750_000,
    totalPaise: 750_000,
    razorpayOrderId: "order_1",
    expiresAt: "2099-01-01T00:00:00.000Z",
    status: "pending_payment",
    canceledAt: null,
    canceledBy: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function gateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway & {
  ordered: number[];
  confirmedAmounts: number[];
} {
  const ordered: number[] = [];
  const confirmedAmounts: number[] = [];
  return {
    id: "razorpay",
    checkoutKeyId: "rzp_test_key",
    ordered,
    confirmedAmounts,
    async createOrder(input): Promise<GatewayOrder> {
      ordered.push(input.amountPaise);
      return { id: "order_1", amountPaise: input.amountPaise, currency: "INR" };
    },
    verifyCheckoutSignature: () => true,
    verifyWebhookSignature: () => true,
    async fetchPayment(): Promise<GatewayPayment> {
      return { id: "pay_1", orderId: "order_1", amountPaise: 750_000, currency: "INR", status: "captured" };
    },
    async createRefund(input): Promise<GatewayRefund> {
      ordered.push(input.amountPaise);
      return { id: "rfnd_1" };
    },
    ...overrides,
    ordered,
    confirmedAmounts,
  };
}

describe("checkout amount", () => {
  it("drops a client total and charges the nightly rate on the server", async () => {
    const command = readCheckoutCommand({
      homeId,
      checkIn: "2026-11-01",
      checkOut: "2026-11-04",
      guests: 2,
      amountPaise: 1,
      totalPaise: 1,
    });
    assert.deepEqual(command, {
      kind: "create",
      homeId,
      checkIn: "2026-11-01",
      checkOut: "2026-11-04",
      guests: 2,
    });
    const fake = gateway();
    const session = await startStayCheckout({
      home: { id: homeId, nightlyRatePaise: 250_000, maxGuests: 4 },
      checkIn: "2026-11-01",
      checkOut: "2026-11-04",
      guests: 2,
      gateway: fake,
      createBooking: async () => ({ id: bookingId, totalPaise: 750_000 }),
    });
    assert.deepEqual(fake.ordered, [750_000]);
    assert.equal(session.amountPaise, 750_000);
  });

  it("refuses to open checkout when the saved booking total disagrees", async () => {
    await assert.rejects(
      () =>
        startStayCheckout({
          home: { id: homeId, nightlyRatePaise: 250_000, maxGuests: 4 },
          checkIn: "2026-11-01",
          checkOut: "2026-11-02",
          guests: 2,
          gateway: gateway(),
          createBooking: async () => ({ id: bookingId, totalPaise: 1 }),
        }),
      /Could not start checkout/,
    );
  });
});

describe("verifyStayPayment", () => {
  it("confirms the booking total after the signature and Razorpay payment match", async () => {
    const confirmed: number[] = [];
    await verifyStayPayment({
      booking: booking(),
      userId: "user_abc",
      orderId: "order_1",
      paymentId: "pay_1",
      signature: "sig",
      gateway: gateway(),
      confirm: async (amountPaise) => {
        confirmed.push(amountPaise);
      },
    });
    assert.deepEqual(confirmed, [750_000]);
  });

  it("rejects a captured payment whose amount is not the stay total", async () => {
    const fake = gateway({
      fetchPayment: async () => ({ id: "pay_1", orderId: "order_1", amountPaise: 1, currency: "INR", status: "captured" }),
    });
    await assert.rejects(
      () =>
        verifyStayPayment({
          booking: booking(),
          userId: "user_abc",
          orderId: "order_1",
          paymentId: "pay_1",
          signature: "sig",
          gateway: fake,
          confirm: async () => {
            throw new Error("should not confirm");
          },
        }),
      /does not match/,
    );
  });
});

describe("resumeStayCheckout", () => {
  it("reopens the existing order for the saved total", () => {
    const session = resumeStayCheckout({
      booking: booking(),
      userId: "user_abc",
      keyId: "rzp_test_key",
      now: new Date("2026-10-15T00:00:00.000Z"),
    });
    assert.equal(session.amountPaise, 750_000);
    assert.equal(session.razorpayOrderId, "order_1");
  });

  it("refuses an expired hold", () => {
    assert.throws(
      () =>
        resumeStayCheckout({
          booking: booking({ expiresAt: "2026-10-01T00:00:00.000Z" }),
          userId: "user_abc",
          keyId: "rzp_test_key",
          now: new Date("2026-10-15T00:00:00.000Z"),
        }),
      /expired/,
    );
  });
});

describe("submitClaimedRefund", () => {
  it("refunds the claimed server amount", async () => {
    const fake = gateway();
    const recorded: Array<{ id: string; refundId: string }> = [];
    const submitted = await submitClaimedRefund({
      claimed: { id: "refund-1", paymentId: "pay_1", amountPaise: 750_000, receipt: "refund-1" },
      gateway: fake,
      recordSubmitted: async (id, refundId) => {
        recorded.push({ id, refundId });
      },
    });
    assert.equal(submitted, true);
    assert.deepEqual(fake.ordered, [750_000]);
    assert.deepEqual(recorded, [{ id: "refund-1", refundId: "rfnd_1" }]);
  });
});
