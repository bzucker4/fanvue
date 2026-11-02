import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { runWorkspaceAudit } from "../src/lib/audit/load";

const mocked = vi.hoisted(() => ({ entitlement: vi.fn(), authorized: vi.fn() }));
vi.mock("../src/lib/live/tokens", () => ({ authorizedClient: mocked.authorized }));
vi.mock("../src/lib/fanvue/entitlement", () => ({ readEntitlement: mocked.entitlement }));

describe("live audit access", () => {
  beforeEach(() => {
    vi.stubEnv("FANVUE_VALIDATION_IMPORT", "false");
    mocked.authorized.mockResolvedValue({ client: {}, config: {} });
  });
  it.each(["inactive", "unknown", "unconfigured"])("blocks %s plans before loading purchase evidence", async (state) => {
    const findUnique = vi.fn().mockResolvedValue({ mode: "live", fanvueUserUuid: "creator" });
    const db = { workspace: { findUnique } } as unknown as PrismaClient;
    mocked.entitlement.mockResolvedValue({ state, message: "Plan verification required" });
    await expect(runWorkspaceAudit(db, "workspace", "bundle")).rejects.toThrow("Plan verification required");
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});
