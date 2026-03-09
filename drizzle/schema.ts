import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Core Auth Table ──────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Team Members ─────────────────────────────────────────────────────────────
export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  role: varchar("role", { length: 128 }).notNull(),
  area: varchar("area", { length: 128 }),
  color: varchar("color", { length: 32 }).default("#6366f1"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  week: int("week").notNull(), // 1–6
  description: text("description").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  pendingReason: text("pendingReason"),
  responsibleId: int("responsibleId"), // memberId responsible for the pending
  memberId: int("memberId").notNull(), // owner of the task
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  dueDate: timestamp("dueDate"),
  reviewFileUrl: text("reviewFileUrl"),
  reviewFileKey: varchar("reviewFileKey", { length: 512 }),
  reviewFileName: varchar("reviewFileName", { length: 256 }),
  reviewFileMimeType: varchar("reviewFileMimeType", { length: 128 }),
  reviewFileSize: int("reviewFileSize"),
  completedAt: timestamp("completedAt"),
  pendingSince: timestamp("pendingSince"),
  notifiedAt: timestamp("notifiedAt"), // last notification sent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 256 }).notNull(),
  originalName: varchar("originalName", { length: 256 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  uploaderId: int("uploaderId"),
  uploaderName: varchar("uploaderName", { length: 128 }),
  processed: boolean("processed").default(false).notNull(),
  processingError: text("processingError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Document Chunks (RAG) ────────────────────────────────────────────────────
export const documentChunks = mysqlTable("documentChunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  chunkIndex: int("chunkIndex").notNull(),
  content: text("content").notNull(),
  // Store embedding as JSON array of floats (1536 dims for text-embedding-3-small)
  embedding: json("embedding").$type<number[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

// ─── Chat Messages ────────────────────────────────────────────────────────────
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 128 }),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  contextUsed: text("contextUsed"), // JSON string of chunk IDs used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
