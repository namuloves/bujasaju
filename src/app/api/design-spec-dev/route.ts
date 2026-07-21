import { createDesignSpecHandler } from "css-spec/server";

// Dev-only: the handler hard-404s in production. Uses fs, so it must run on the
// Node runtime, not Edge.
export const POST = createDesignSpecHandler();
export const runtime = "nodejs";
