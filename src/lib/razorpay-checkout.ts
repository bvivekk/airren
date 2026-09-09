export type StayCheckout = {
  bookingId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
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
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
}) => RazorpayCheckout;

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
      contact: options.contact,
    },
    readonly: {
      email: true,
      contact: true,
    },
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
