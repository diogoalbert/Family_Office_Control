import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  chatMessages,
  documentChunks,
  documents,
  tasks,
  teamMembers,
  users,
  type InsertChatMessage,
  type InsertDocument,
  type InsertDocumentChunk,
  type InsertTask,
  type InsertTeamMember,
  type TeamMember,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { INTERNAL_QUESTIONS } from "../shared/internalQuestions";

let _db: ReturnType<typeof drizzle> | null = null;
let localTeamMembers: TeamMember[] = [];
let localTeamMemberId = 1;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Team Members ─────────────────────────────────────────────────────────────
export async function getAllTeamMembers() {
  const db = await getDb();
  if (!db) {
    return [...localTeamMembers].sort((a, b) => a.name.localeCompare(b.name));
  }
  return db.select().from(teamMembers).orderBy(teamMembers.name);
}

export async function createTeamMember(data: InsertTeamMember) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const member: TeamMember = {
      id: localTeamMemberId++,
      name: data.name,
      role: data.role,
      area: data.area ?? null,
      color: data.color ?? "#6366f1",
      userId: data.userId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    localTeamMembers.push(member);
    return { insertId: member.id };
  }
  try {
    const result = await db.insert(teamMembers).values(data);
    return result;
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    const causeMessage = String((error as any)?.cause?.message ?? "");
    const isMissingTeamColumns =
      String((error as any)?.code ?? (error as any)?.cause?.code ?? "") === "ER_BAD_FIELD_ERROR" ||
      /Unknown column/i.test(message) ||
      /Unknown column/i.test(causeMessage);
    if (!isMissingTeamColumns) throw error;

    // Backward compatibility for environments with older teamMembers schema.
    return db.execute(sql`
      insert into teamMembers (name, role)
      values (${data.name}, ${data.role})
    `);
  }
}

export async function updateTeamMember(id: number, data: Partial<InsertTeamMember>) {
  const db = await getDb();
  if (!db) {
    const index = localTeamMembers.findIndex((member) => member.id === id);
    if (index === -1) throw new Error("Team member not found");
    const current = localTeamMembers[index];
    localTeamMembers[index] = {
      ...current,
      ...data,
      area: data.area === undefined ? current.area : data.area,
      color: data.color === undefined ? current.color : data.color,
      userId: data.userId === undefined ? current.userId : data.userId,
      updatedAt: new Date(),
    };
    return { success: true };
  }
  try {
    return db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    const causeMessage = String((error as any)?.cause?.message ?? "");
    const isMissingTeamColumns =
      String((error as any)?.code ?? (error as any)?.cause?.code ?? "") === "ER_BAD_FIELD_ERROR" ||
      /Unknown column/i.test(message) ||
      /Unknown column/i.test(causeMessage);
    if (!isMissingTeamColumns) throw error;

    const setClauses: any[] = [];
    if (data.name !== undefined) setClauses.push(sql`name = ${data.name}`);
    if (data.role !== undefined) setClauses.push(sql`role = ${data.role}`);
    if (setClauses.length === 0) return { success: true };
    return db.execute(sql`update teamMembers set ${sql.join(setClauses, sql`, `)} where id = ${id}`);
  }
}

export async function deleteTeamMember(id: number) {
  const db = await getDb();
  if (!db) {
    localTeamMembers = localTeamMembers.filter((member) => member.id !== id);
    return { success: true };
  }
  return db.delete(teamMembers).where(eq(teamMembers.id, id));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function getAllTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).orderBy(tasks.week, tasks.memberId);
}

export async function getTasksByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.memberId, memberId)).orderBy(tasks.week);
}

export async function getTasksByWeek(week: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.week, week)).orderBy(tasks.memberId);
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  try {
    const result = await db.insert(tasks).values(data);
    return result;
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    const causeMessage = String((error as any)?.cause?.message ?? "");
    const isMissingReviewColumns =
      String((error as any)?.code ?? (error as any)?.cause?.code ?? "") === "ER_BAD_FIELD_ERROR" ||
      /Unknown column/i.test(message) ||
      /Unknown column/i.test(causeMessage);
    if (!isMissingReviewColumns) throw error;

    return db.execute(sql`
      insert into tasks (
        week,
        description,
        status,
        pendingReason,
        responsibleId,
        memberId,
        priority,
        dueDate,
        completedAt,
        pendingSince,
        notifiedAt
      ) values (
        ${data.week},
        ${data.description},
        ${data.status ?? "pending"},
        ${data.pendingReason ?? null},
        ${data.responsibleId ?? null},
        ${data.memberId},
        ${data.priority ?? "medium"},
        ${data.dueDate ?? null},
        ${data.completedAt ?? null},
        ${data.pendingSince ?? null},
        ${data.notifiedAt ?? null}
      )
    `);
  }
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  try {
    return db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id));
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    const causeMessage = String((error as any)?.cause?.message ?? "");
    const isMissingReviewColumns =
      String((error as any)?.code ?? (error as any)?.cause?.code ?? "") === "ER_BAD_FIELD_ERROR" ||
      /Unknown column/i.test(message) ||
      /Unknown column/i.test(causeMessage);
    if (!isMissingReviewColumns) throw error;

    const setClauses: any[] = [];
    if (data.week !== undefined) setClauses.push(sql`week = ${data.week}`);
    if (data.description !== undefined) setClauses.push(sql`description = ${data.description}`);
    if (data.status !== undefined) setClauses.push(sql`status = ${data.status}`);
    if (data.pendingReason !== undefined) setClauses.push(sql`pendingReason = ${data.pendingReason}`);
    if (data.responsibleId !== undefined) setClauses.push(sql`responsibleId = ${data.responsibleId}`);
    if (data.memberId !== undefined) setClauses.push(sql`memberId = ${data.memberId}`);
    if (data.priority !== undefined) setClauses.push(sql`priority = ${data.priority}`);
    if (data.dueDate !== undefined) setClauses.push(sql`dueDate = ${data.dueDate}`);
    if (data.completedAt !== undefined) setClauses.push(sql`completedAt = ${data.completedAt}`);
    if (data.pendingSince !== undefined) setClauses.push(sql`pendingSince = ${data.pendingSince}`);
    if (data.notifiedAt !== undefined) setClauses.push(sql`notifiedAt = ${data.notifiedAt}`);
    setClauses.push(sql`updatedAt = ${new Date()}`);

    return db.execute(sql`update tasks set ${sql.join(setClauses, sql`, `)} where id = ${id}`);
  }
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(tasks).where(eq(tasks.id, id));
}

// Tasks pending for more than 2 days (for notifications)
export async function getOverduePendingTasks() {
  const db = await getDb();
  if (!db) return [];
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "pending"),
        lt(tasks.pendingSince, twoDaysAgo),
        sql`(${tasks.notifiedAt} IS NULL OR ${tasks.notifiedAt} < ${twoDaysAgo})`
      )
    );
}

export async function markTaskNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  return db.update(tasks).set({ notifiedAt: new Date() }).where(eq(tasks.id, id));
}

// Check if all tasks in a week are completed
export async function getWeekCompletionStatus(week: number) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, allDone: false };
  const all = await db.select().from(tasks).where(eq(tasks.week, week));
  const completed = all.filter((t) => t.status === "completed").length;
  return { total: all.length, completed, allDone: all.length > 0 && completed === all.length };
}

// ─── Internal Questions ───────────────────────────────────────────────────────
async function ensureInternalQuestionAnswersTable() {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS internalQuestionAnswers (
      id int NOT NULL AUTO_INCREMENT,
      code varchar(32) NOT NULL,
      answer text NULL,
      createdAt timestamp NOT NULL DEFAULT (now()),
      updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY internalQuestionAnswers_code_unique (code)
    )
  `);
}

export async function getInternalQuestions() {
  const db = await getDb();
  if (!db) {
    return INTERNAL_QUESTIONS.map((q) => ({ ...q, answer: "", answerUpdatedAt: null as Date | null }));
  }
  await ensureInternalQuestionAnswersTable();

  const rowsResult = await db.execute(sql`select code, answer, updatedAt from internalQuestionAnswers`);
  // mysql2 raw results may come as [rows, fields] depending on driver/runtime path.
  const rowsSource = Array.isArray(rowsResult)
    ? (Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult)
    : (rowsResult as any)?.rows;
  const rows = ((rowsSource ?? []) as Array<{
    code: string;
    answer: string | null;
    updatedAt: Date | string;
  }>).filter((row) => Boolean(row?.code));
  const answerMap = new Map(rows.map((r) => [r.code, r]));

  return INTERNAL_QUESTIONS.map((q) => {
    const answer = answerMap.get(q.code);
    return {
      ...q,
      answer: answer?.answer ?? "",
      answerUpdatedAt: answer?.updatedAt ? new Date(answer.updatedAt) : null,
    };
  });
}

export async function upsertInternalQuestionAnswer(code: string, answer: string) {
  const db = await getDb();
  if (!db) return { success: true };
  await ensureInternalQuestionAnswersTable();
  await db.execute(sql`
    insert into internalQuestionAnswers (code, answer)
    values (${code}, ${answer})
    on duplicate key update
      answer = values(answer),
      updatedAt = now()
  `);
  return { success: true };
}

// ─── Documents ────────────────────────────────────────────────────────────────
export async function getAllDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(documents).values(data);
  return result;
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(documentChunks).where(eq(documentChunks.documentId, id));
  return db.delete(documents).where(eq(documents.id, id));
}

export async function getUnprocessedDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.processed, false));
}

// ─── Document Chunks (RAG) ────────────────────────────────────────────────────
export async function saveDocumentChunks(chunks: InsertDocumentChunk[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (chunks.length === 0) return;
  // Insert in batches of 50
  for (let i = 0; i < chunks.length; i += 50) {
    await db.insert(documentChunks).values(chunks.slice(i, i + 50));
  }
}

export async function getAllChunksWithEmbeddings() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(documentChunks)
    .where(sql`${documentChunks.embedding} IS NOT NULL`);
}

export async function deleteChunksByDocument(documentId: number) {
  const db = await getDb();
  if (!db) return;
  return db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────
export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(chatMessages).values(data);
  return result;
}

export async function getRecentChatMessages(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function clearChatHistory() {
  const db = await getDb();
  if (!db) return;
  return db.delete(chatMessages);
}
