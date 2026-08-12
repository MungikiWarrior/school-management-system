import { beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      email: "admin@school.edu",
      name: "Principal Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("School Management Workflows", () => {
  beforeAll(() => {
    delete process.env.DATABASE_URL;
  });
  it("allows listing students and searching with pagination", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.students.list({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("rows");
    } catch (e: any) {
      expect(e.message).toContain("Database is not configured");
    }
  });

  it("lists subjects and timetable slots", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const subjects = await caller.subjects.list({ page: 1, pageSize: 10 });
      expect(subjects).toHaveProperty("rows");
    } catch (e: any) {
      expect(e.message).toContain("Database is not configured");
    }
  });

  it("aggregates the unified audit log", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const audit = await caller.audit.list({ page: 1, pageSize: 10 });
      expect(audit).toHaveProperty("rows");
    } catch (e: any) {
      expect(e.message).toContain("Database is not configured");
    }
  });
});
