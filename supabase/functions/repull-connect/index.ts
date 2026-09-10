import "@supabase/functions-js/edge-runtime.d.ts";
import { repull } from "../_shared/repull/mod.ts";

Deno.serve((request: Request): Promise<Response> => repull.connect.handle(request));
