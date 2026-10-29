import { vi } from "vitest";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Replaces global fetch. Each call gets the next response (the last one repeats). */
export function mockFetch(...responses: Array<Response | Error | (() => Response | Promise<Response>)>) {
  let i = 0;
  const fn = vi.fn(async (_url: string | URL, _init?: RequestInit) => {
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    // Response bodies can only be read once, so clone when a response is reused.
    return typeof r === "function" ? r() : r.clone();
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** The URL Ticketmaster was called with on the given call. */
export function calledUrl(fn: ReturnType<typeof mockFetch>, call = 0): URL {
  return new URL(String(fn.mock.calls[call][0]));
}

export function timeoutError(): Error {
  return new DOMException("The operation was aborted due to timeout", "TimeoutError");
}
