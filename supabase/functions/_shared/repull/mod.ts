import { commandFromDelivery } from "./command.ts";
import { handleRepullConnect } from "./connect.ts";
import { project } from "./projector.ts";
import { failureResponse, webhookResponse } from "./response.ts";

export interface RepullWebhookModule {
  handle(request: Request): Promise<Response>;
}

export interface RepullConnectModule {
  handle(request: Request): Promise<Response>;
}

async function handleRepullWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  try {
    const rawBody = await request.text();
    const command = await commandFromDelivery(rawBody, request.headers);
    const outcome = await project(command);
    return webhookResponse(outcome);
  } catch (error) {
    return failureResponse(error);
  }
}

export const repull: {
  readonly webhooks: RepullWebhookModule;
  readonly connect: RepullConnectModule;
} = {
  get webhooks(): RepullWebhookModule {
    return { handle: handleRepullWebhook };
  },
  get connect(): RepullConnectModule {
    return { handle: handleRepullConnect };
  },
};
