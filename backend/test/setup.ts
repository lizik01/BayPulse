import { beforeEach, vi } from "vitest";
import { clearCaches } from "../src/services/ticketmasterService";

export const TEST_API_KEY = "TEST_KEY_DO_NOT_LEAK";

beforeEach(() => {
  process.env.TICKETMASTER_API_KEY = TEST_API_KEY;
  clearCaches();
  // The service logs upstream failures; keep test output quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
