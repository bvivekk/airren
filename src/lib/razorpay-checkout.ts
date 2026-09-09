export type StayCheckout = {
  bookingId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
};

type UpiIntentAppInstrument = {
  method: "upi";
  flows: ["intent"];
  apps: ["google_pay"] | ["phonepe"];
};

type UpiQrAndIntentInstrument = {
  method: "upi";
  flows: ["qr", "intent"];
};

export type RazorpayCheckoutMethods = {
  upi: true;
  card: true;
  netbanking: true;
  wallet: true;
};

export type RazorpayDisplayConfig = {
  display: {
    blocks: {
      gpay: { name: "Google Pay"; instruments: [UpiIntentAppInstrument] };
      phonepe: { name: "PhonePe"; instruments: [UpiIntentAppInstrument] };
      upi_qr: { name: "UPI"; instruments: [UpiQrAndIntentInstrument] };
    };
    sequence: ["block.gpay", "block.phonepe", "block.upi_qr", "upi", "card", "netbanking", "wallet"];
    preferences: { show_default_blocks: true };
  };
};

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { email?: string; contact?: string; name?: string };
  readonly: { email?: boolean; contact?: boolean };
  method: RazorpayCheckoutMethods;
  config: RazorpayDisplayConfig;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
}) => RazorpayCheckout;

export function razorpayCheckoutMethods(): RazorpayCheckoutMethods {
  return {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
  };
}

export function razorpayUpiAppDisplay(): RazorpayDisplayConfig {
  return {
    display: {
      blocks: {
        gpay: {
          name: "Google Pay",
          instruments: [{ method: "upi", flows: ["intent"], apps: ["google_pay"] }],
        },
        phonepe: {
          name: "PhonePe",
          instruments: [{ method: "upi", flows: ["intent"], apps: ["phonepe"] }],
        },
        upi_qr: {
          name: "UPI",
          instruments: [{ method: "upi", flows: ["qr", "intent"] }],
        },
      },
      sequence: ["block.gpay", "block.phonepe", "block.upi_qr", "upi", "card", "netbanking", "wallet"],
      preferences: { show_default_blocks: true },
    },
  };
}

function razorpayCtor(): RazorpayConstructor | undefined {
  const candidate = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  return candidate;
}

export async function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  const existing = razorpayCtor();
  if (existing) {
    return existing;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("could not load Razorpay"));
    document.head.appendChild(script);
  });
  const loaded = razorpayCtor();
  if (!loaded) {
    throw new Error("could not load Razorpay");
  }
  return loaded;
}

export async function openRazorpayCheckout(options: {
  checkout: StayCheckout;
  description: string;
  email?: string;
  contact?: string;
  onPaid: () => void;
  onDismiss: () => void;
}): Promise<void> {
  const Razorpay = await loadRazorpayCheckout();
  const widget = new Razorpay({
    key: options.checkout.keyId,
    amount: options.checkout.amountPaise,
    currency: options.checkout.currency,
    order_id: options.checkout.razorpayOrderId,
    name: "Airren",
    description: options.description,
    prefill: {
      name: "Guest",
      email: options.email,
      ...(options.contact ? { contact: options.contact } : {}),
    },
    readonly: {
      email: true,
      contact: Boolean(options.contact),
    },
    method: razorpayCheckoutMethods(),
    config: razorpayUpiAppDisplay(),
    handler: () => {
      options.onPaid();
    },
    modal: {
      ondismiss: () => {
        options.onDismiss();
      },
    },
    theme: { color: "#111111" },
  });
  widget.open();
}
