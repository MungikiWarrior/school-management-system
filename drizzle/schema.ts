import { boolean, date, integer, pgEnum, pgTable, real, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "teacher", "student"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
export const editRequestStatusEnum = pgEnum("edit_request_status", ["PENDING", "APPROVED", "REJECTED"]);
export const credentialChannelEnum = pgEnum("credential_channel", ["EMAIL", "SMS"]);
export const credentialStatusEnum = pgEnum("credential_status", ["SENT", "FAILED"]);

export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  identifier: varchar("identifier", { length: 64 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 128 }),
  mustResetPassword: boolean("mustResetPassword").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const teachers = pgTable("teachers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().unique(),
  fullName: varchar("fullName", { length: 150 }).notNull(),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const classGroups = pgTable("classGroups", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  gradeLevel: integer("gradeLevel").notNull(),
  classTeacherId: integer("classTeacherId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().unique(),
  regNumber: varchar("regNumber", { length: 64 }).notNull().unique(),
  fullName: varchar("fullName", { length: 150 }).notNull(),
  gender: genderEnum("gender").notNull(),
  gradeLevel: integer("gradeLevel").notNull(),
  classGroupId: integer("classGroupId"),
  guardianName: varchar("guardianName", { length: 150 }),
  guardianPhone: varchar("guardianPhone", { length: 50 }),
  guardianEmail: varchar("guardianEmail", { length: 320 }),
  graduated: boolean("graduated").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subjects = pgTable("subjects", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  gradeLevel: integer("gradeLevel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const timetables = pgTable("timetables", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  classGroupId: integer("classGroupId").notNull(),
  subjectId: integer("subjectId").notNull(),
  teacherId: integer("teacherId").notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 10 }).notNull(),
  endTime: varchar("endTime", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const attendances = pgTable("attendances", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  studentId: integer("studentId").notNull(),
  classGroupId: integer("classGroupId").notNull(),
  date: date("date").notNull(),
  status: attendanceStatusEnum("status").default("PRESENT").notNull(),
  recordedById: integer("recordedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const results = pgTable("results", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  studentId: integer("studentId").notNull(),
  subjectId: integer("subjectId").notNull(),
  recordedById: integer("recordedById").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  score: real("score").notNull(),
  maxScore: real("maxScore").default(100).notNull(),
  term: varchar("term", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resultEditRequests = pgTable("resultEditRequests", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  resultId: integer("resultId").notNull(),
  requestedById: integer("requestedById").notNull(),
  newScore: real("newScore").notNull(),
  newMaxScore: real("newMaxScore").notNull(),
  newTitle: varchar("newTitle", { length: 150 }).notNull(),
  newTerm: varchar("newTerm", { length: 50 }).notNull(),
  reason: text("reason"),
  status: editRequestStatusEnum("status").default("PENDING").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 150 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const promotionRecords = pgTable("promotionRecords", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  studentId: integer("studentId").notNull(),
  term: varchar("term", { length: 50 }).notNull(),
  averageScore: real("averageScore").notNull(),
  previousGrade: integer("previousGrade").notNull(),
  newGrade: integer("newGrade").notNull(),
  promoted: boolean("promoted").notNull(),
  graduated: boolean("graduated").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = pgTable("auditLogs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  actorName: varchar("actorName", { length: 150 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details").notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: integer("entityId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const credentialNotifications = pgTable("credentialNotifications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  identifier: varchar("identifier", { length: 64 }).notNull(),
  temporaryPasswordHash: varchar("temporaryPasswordHash", { length: 128 }).notNull(),
  channel: credentialChannelEnum("channel").default("EMAIL").notNull(),
  status: credentialStatusEnum("status").default("SENT").notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;
export type ClassGroup = typeof classGroups.$inferSelect;
export type InsertClassGroup = typeof classGroups.$inferInsert;
export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;
export type Timetable = typeof timetables.$inferSelect;
export type InsertTimetable = typeof timetables.$inferInsert;
export type Attendance = typeof attendances.$inferSelect;
export type InsertAttendance = typeof attendances.$inferInsert;
export type Result = typeof results.$inferSelect;
export type InsertResult = typeof results.$inferInsert;
export type ResultEditRequest = typeof resultEditRequests.$inferSelect;
export type InsertResultEditRequest = typeof resultEditRequests.$inferInsert;
export type PromotionRecord = typeof promotionRecords.$inferSelect;
export type InsertPromotionRecord = typeof promotionRecords.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
