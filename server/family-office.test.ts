import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB helpers
vi.mock("./db", () => ({
  getAllTeamMembers: vi.fn().mockResolvedValue([
    { id: 1, name: "Diogo Reis", role: "Portugal Tax", area: "Tax", color: "#60a5fa", userId: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  createTeamMember: vi.fn().mockResolvedValue({ insertId: 2 }),
  updateTeamMember: vi.fn().mockResolvedValue({}),
  deleteTeamMember: vi.fn().mockResolvedValue({}),
  getAllTasks: vi.fn().mockResolvedValue([
    { id: 1, week: 1, description: "Baseline and guardrails", status: "completed", memberId: 1, priority: "high", pendingReason: null, responsibleId: null, completedAt: new Date(), pendingSince: null, notifiedAt: null, dueDate: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, week: 2, description: "As-is map", status: "pending", memberId: 1, priority: "medium", pendingReason: "Aguardando dados", responsibleId: null, completedAt: null, pendingSince: new Date(), notifiedAt: null, dueDate: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getTasksByMember: vi.fn().mockResolvedValue([]),
  getTasksByWeek: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({ insertId: 3 }),
  updateTask: vi.fn().mockResolvedValue({}),
  deleteTask: vi.fn().mockResolvedValue({}),
  getOverduePendingTasks: vi.fn().mockResolvedValue([]),
  markTaskNotified: vi.fn().mockResolvedValue({}),
  getWeekCompletionStatus: vi.fn().mockResolvedValue({ total: 2, completed: 1, allDone: false }),
  getAllDocuments: vi.fn().mockResolvedValue([]),
  createDocument: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateDocument: vi.fn().mockResolvedValue({}),
  deleteDocument: vi.fn().mockResolvedValue({}),
  getUnprocessedDocuments: vi.fn().mockResolvedValue([]),
  saveDocumentChunks: vi.fn().mockResolvedValue({}),
  getAllChunksWithEmbeddings: vi.fn().mockResolvedValue([]),
  deleteChunksByDocument: vi.fn().mockResolvedValue({}),
  saveChatMessage: vi.fn().mockResolvedValue({ insertId: 1 }),
  getRecentChatMessages: vi.fn().mockResolvedValue([]),
  clearChatHistory: vi.fn().mockResolvedValue({}),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("returns null user for unauthenticated context", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });

  it("returns user for authenticated context", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Test User");
  });
});

// ─── Team Members Tests ───────────────────────────────────────────────────────
describe("teamMembers", () => {
  it("lists team members", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const members = await caller.teamMembers.list();
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThan(0);
    expect(members[0].name).toBe("Diogo Reis");
  });

  it("creates a team member (requires auth)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.teamMembers.create({
      name: "Victor Tassini",
      role: "Project Management",
      area: "PMO",
      color: "#38bdf8",
    });
    expect(result.success).toBe(true);
  });

  it("rejects member creation without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.teamMembers.create({ name: "Test", role: "Test" })
    ).rejects.toThrow();
  });
});

// ─── Tasks Tests ──────────────────────────────────────────────────────────────
describe("tasks", () => {
  it("lists all tasks", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(2);
  });

  it("creates a task (requires auth)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.create({
      week: 1,
      description: "Test task",
      memberId: 1,
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("updates task status (requires auth)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.updateStatus({
      id: 1,
      status: "completed",
      week: 1,
    });
    expect(result.success).toBe(true);
  });

  it("updates pending task with reason", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.updateStatus({
      id: 2,
      status: "pending",
      pendingReason: "Aguardando aprovação",
      responsibleId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("checks overdue notifications", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.checkOverdueNotifications();
    expect(result).toHaveProperty("notified");
    expect(typeof result.notified).toBe("number");
  });
});

// ─── Documents Tests ──────────────────────────────────────────────────────────
describe("documents", () => {
  it("lists documents", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const docs = await caller.documents.list();
    expect(Array.isArray(docs)).toBe(true);
  });

  it("processes documents (requires auth)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.documents.processDocuments();
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("total");
  });
});

// ─── Chat Tests ───────────────────────────────────────────────────────────────
describe("chat", () => {
  it("returns chat history", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const history = await caller.chat.history();
    expect(Array.isArray(history)).toBe(true);
  });
});

// ─── Logout Test ──────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
