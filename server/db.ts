import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  auditLogs,
  classGroups,
  credentialNotifications,
  InsertAuditLog,
  InsertAttendance,
  InsertClassGroup,
  InsertStudent,
  InsertSubject,
  InsertTeacher,
  InsertTimetable,
  InsertUser,
  attendances,
  promotionRecords,
  resultEditRequests,
  results,
  students,
  subjects,
  teachers,
  timetables,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_URL.includes("localhost") ? false : 'require', max: 10 });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["identifier", "name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
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
  if (user.mustResetPassword !== undefined) {
    values.mustResetPassword = user.mustResetPassword;
    updateSet.mustResetPassword = user.mustResetPassword;
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listStudents(input: { page: number; pageSize: number; search?: string; gradeLevel?: number; classGroupId?: number }) {
  const db = await requireDb();
  const filters = [];
  if (input.search) {
    const query = `%${input.search.trim()}%`;
    filters.push(or(like(students.fullName, query), like(students.regNumber, query)));
  }
  if (input.gradeLevel) filters.push(eq(students.gradeLevel, input.gradeLevel));
  if (input.classGroupId) filters.push(eq(students.classGroupId, input.classGroupId));
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(students).where(where).orderBy(desc(students.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: count() }).from(students).where(where),
  ]);
  return { rows, total: Number(totals[0]?.count ?? 0) };
}

export async function listTeachers(input: { page: number; pageSize: number; search?: string }) {
  const db = await requireDb();
  const where = input.search ? or(like(teachers.fullName, `%${input.search.trim()}%`), like(teachers.email, `%${input.search.trim()}%`)) : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(teachers).where(where).orderBy(desc(teachers.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: count() }).from(teachers).where(where),
  ]);
  return { rows, total: Number(totals[0]?.count ?? 0) };
}

export async function listClassGroups(input: { page: number; pageSize: number; search?: string }) {
  const db = await requireDb();
  const where = input.search ? like(classGroups.name, `%${input.search.trim()}%`) : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(classGroups).where(where).orderBy(classGroups.gradeLevel, classGroups.name).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: count() }).from(classGroups).where(where),
  ]);
  return { rows, total: Number(totals[0]?.count ?? 0) };
}

export async function listSubjects(input: { page: number; pageSize: number; search?: string; gradeLevel?: number }) {
  const db = await requireDb();
  const filters = [];
  if (input.search) filters.push(or(like(subjects.name, `%${input.search.trim()}%`), like(subjects.code, `%${input.search.trim()}%`)));
  if (input.gradeLevel) filters.push(eq(subjects.gradeLevel, input.gradeLevel));
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(subjects).where(where).orderBy(subjects.gradeLevel, subjects.name).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: count() }).from(subjects).where(where),
  ]);
  return { rows, total: Number(totals[0]?.count ?? 0) };
}

export async function listTimetable(classGroupId?: number) {
  const db = await requireDb();
  return db.select({ id: timetables.id, classGroupId: timetables.classGroupId, subjectId: timetables.subjectId, teacherId: timetables.teacherId, dayOfWeek: timetables.dayOfWeek, startTime: timetables.startTime, endTime: timetables.endTime, subjectName: subjects.name, className: classGroups.name, teacherName: teachers.fullName }).from(timetables).leftJoin(subjects, eq(timetables.subjectId, subjects.id)).leftJoin(classGroups, eq(timetables.classGroupId, classGroups.id)).leftJoin(teachers, eq(timetables.teacherId, teachers.id)).where(classGroupId ? eq(timetables.classGroupId, classGroupId) : undefined).orderBy(timetables.dayOfWeek, timetables.startTime);
}

export async function listAuditLogs(input: { page: number; pageSize: number; search?: string }) {
  const db = await requireDb();
  const where = input.search
    ? or(like(auditLogs.actorName, `%${input.search.trim()}%`), like(auditLogs.action, `%${input.search.trim()}%`), like(auditLogs.details, `%${input.search.trim()}%`))
    : undefined;
  const [rows, totals] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: count() }).from(auditLogs).where(where),
  ]);
  return { rows, total: Number(totals[0]?.count ?? 0) };
}

export async function getDashboardCounts() {
  const db = await requireDb();
  const [studentCount, teacherCount, classCount, subjectCount, pendingEdits, recentAudit] = await Promise.all([
    db.select({ count: count() }).from(students).where(eq(students.graduated, false)),
    db.select({ count: count() }).from(teachers),
    db.select({ count: count() }).from(classGroups),
    db.select({ count: count() }).from(subjects),
    db.select({ count: count() }).from(resultEditRequests).where(eq(resultEditRequests.status, "PENDING")),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(5),
  ]);
  return {
    students: Number(studentCount[0]?.count ?? 0),
    teachers: Number(teacherCount[0]?.count ?? 0),
    classes: Number(classCount[0]?.count ?? 0),
    subjects: Number(subjectCount[0]?.count ?? 0),
    pendingEdits: Number(pendingEdits[0]?.count ?? 0),
    recentAudit,
  };
}

export async function createAuditLog(input: InsertAuditLog) {
  const db = await requireDb();
  await db.insert(auditLogs).values(input);
}

export async function createCredentialNotification(input: {
  userId: number;
  recipient: string;
  identifier: string;
  temporaryPasswordHash: string;
  channel: "EMAIL" | "SMS";
  status: "SENT" | "FAILED";
  errorMessage?: string;
}) {
  const db = await requireDb();
  await db.insert(credentialNotifications).values(input);
}

export async function findStudentById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return rows[0];
}

export async function findTeacherById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return rows[0];
}

export async function findClassById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
  return rows[0];
}

export async function insertStudent(input: InsertStudent) {
  const db = await requireDb();
  const res = await db.insert(students).values(input).returning({ id: students.id });
  return Number(res[0]?.id ?? 0);
}

export async function insertTeacher(input: InsertTeacher) {
  const db = await requireDb();
  const res = await db.insert(teachers).values(input).returning({ id: teachers.id });
  return Number(res[0]?.id ?? 0);
}

export async function insertClass(input: InsertClassGroup) {
  const db = await requireDb();
  const res = await db.insert(classGroups).values(input).returning({ id: classGroups.id });
  return Number(res[0]?.id ?? 0);
}

export async function insertSubject(input: InsertSubject) {
  const db = await requireDb();
  const res = await db.insert(subjects).values(input).returning({ id: subjects.id });
  return Number(res[0]?.id ?? 0);
}

export async function insertTimetable(input: InsertTimetable) {
  const db = await requireDb();
  const res = await db.insert(timetables).values(input).returning({ id: timetables.id });
  return Number(res[0]?.id ?? 0);
}

export async function updateStudent(id: number, input: Partial<InsertStudent>) {
  const db = await requireDb();
  await db.update(students).set(input).where(eq(students.id, id));
}

export async function updateTeacher(id: number, input: Partial<InsertTeacher>) {
  const db = await requireDb();
  await db.update(teachers).set(input).where(eq(teachers.id, id));
}

export async function updateClass(id: number, input: Partial<InsertClassGroup>) {
  const db = await requireDb();
  await db.update(classGroups).set(input).where(eq(classGroups.id, id));
}

export async function updateSubject(id: number, input: Partial<InsertSubject>) {
  const db = await requireDb();
  await db.update(subjects).set(input).where(eq(subjects.id, id));
}

export async function updateTimetable(id: number, input: Partial<InsertTimetable>) {
  const db = await requireDb();
  await db.update(timetables).set(input).where(eq(timetables.id, id));
}

export async function deleteStudent(id: number) {
  const db = await requireDb();
  await db.delete(students).where(eq(students.id, id));
}

export async function deleteTeacher(id: number) {
  const db = await requireDb();
  await db.delete(teachers).where(eq(teachers.id, id));
}

export async function deleteClass(id: number) {
  const db = await requireDb();
  await db.delete(classGroups).where(eq(classGroups.id, id));
}

export async function deleteSubject(id: number) {
  const db = await requireDb();
  await db.delete(subjects).where(eq(subjects.id, id));
}

export async function deleteTimetable(id: number) {
  const db = await requireDb();
  await db.delete(timetables).where(eq(timetables.id, id));
}

export async function insertAttendance(input: InsertAttendance) {
  const db = await requireDb();
  await db.insert(attendances).values(input);
}

export async function listAttendance(input: { classGroupId?: number; date?: string }) {
  const db = await requireDb();
  const filters = [];
  if (input.classGroupId) filters.push(eq(attendances.classGroupId, input.classGroupId));
  if (input.date) filters.push(eq(attendances.date, input.date));
  return db.select().from(attendances).where(filters.length ? and(...filters) : undefined).orderBy(desc(attendances.createdAt));
}

export async function insertResult(input: typeof results.$inferInsert) {
  const db = await requireDb();
  const res = await db.insert(results).values(input).returning({ id: results.id });
  return Number(res[0]?.id ?? 0);
}

export async function listResults(input: { studentId?: number; term?: string }) {
  const db = await requireDb();
  const filters = [];
  if (input.studentId) filters.push(eq(results.studentId, input.studentId));
  if (input.term) filters.push(eq(results.term, input.term));
  return db.select({ id: results.id, studentId: results.studentId, subjectId: results.subjectId, recordedById: results.recordedById, title: results.title, score: results.score, maxScore: results.maxScore, term: results.term, createdAt: results.createdAt, studentName: students.fullName, regNumber: students.regNumber, subjectName: subjects.name, subjectCode: subjects.code }).from(results).leftJoin(students, eq(results.studentId, students.id)).leftJoin(subjects, eq(results.subjectId, subjects.id)).where(filters.length ? and(...filters) : undefined).orderBy(desc(results.createdAt));
}

export async function insertPromotionRecord(input: typeof promotionRecords.$inferInsert) {
  const db = await requireDb();
  await db.insert(promotionRecords).values(input);
}

export async function listPromotionRecords(studentId?: number) {
  const db = await requireDb();
  return db.select().from(promotionRecords).where(studentId ? eq(promotionRecords.studentId, studentId) : undefined).orderBy(desc(promotionRecords.createdAt));
}

export async function getUnifiedAuditLog(input: { page: number; pageSize: number; search?: string }) {
  const db = await requireDb();
  const [generic, promotions, editRequests] = await Promise.all([
    db.select().from(auditLogs),
    db.select().from(promotionRecords),
    db.select().from(resultEditRequests),
  ]);

  const entries = [
    ...generic.map(row => ({ id: `audit-${row.id}`, actorName: row.actorName, action: row.action, details: row.details, entityType: row.entityType, entityId: row.entityId, createdAt: row.createdAt })),
    ...promotions.map(row => ({ id: `promotion-${row.id}`, actorName: "Promotion workflow", action: row.graduated ? "GRADUATION" : "PROMOTION", details: JSON.stringify({ studentId: row.studentId, term: row.term, averageScore: row.averageScore, previousGrade: row.previousGrade, newGrade: row.newGrade, promoted: row.promoted }), entityType: "PromotionRecord", entityId: row.id, createdAt: row.createdAt })),
    ...editRequests.map(row => ({ id: `result-edit-${row.id}`, actorName: `User #${row.requestedById}`, action: `RESULT_EDIT_${row.status}`, details: JSON.stringify({ resultId: row.resultId, newScore: row.newScore, newMaxScore: row.newMaxScore, newTitle: row.newTitle, newTerm: row.newTerm, reason: row.reason, resolvedBy: row.resolvedBy }), entityType: "ResultEditRequest", entityId: row.id, createdAt: row.createdAt })),
  ].filter(entry => {
    if (!input.search) return true;
    const needle = input.search.trim().toLowerCase();
    return `${entry.actorName} ${entry.action} ${entry.details} ${entry.entityType}`.toLowerCase().includes(needle);
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const start = (input.page - 1) * input.pageSize;
  return { rows: entries.slice(start, start + input.pageSize), total: entries.length };
}

export async function updateResult(id: number, input: Partial<typeof results.$inferInsert>) {
  const db = await requireDb();
  await db.update(results).set(input).where(eq(results.id, id));
}

export async function updateUser(id: number, input: Partial<InsertUser>) {
  const db = await requireDb();
  await db.update(users).set(input).where(eq(users.id, id));
}

export async function getUserByIdentifier(identifier: string) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(eq(users.identifier, identifier)).limit(1);
  return rows[0];
}

export async function getTeacherByUserId(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(teachers).where(eq(teachers.userId, userId)).limit(1);
  return rows[0];
}

export async function getStudentByUserId(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  return rows[0];
}

export async function createUser(input: InsertUser) {
  const db = await requireDb();
  const res = await db.insert(users).values(input).returning({ id: users.id });
  return Number(res[0]?.id ?? 0);
}

export async function deleteUser(id: number) {
  const db = await requireDb();
  await db.delete(users).where(eq(users.id, id));
}

export async function createResultEditRequest(input: typeof resultEditRequests.$inferInsert) {
  const db = await requireDb();
  const res = await db.insert(resultEditRequests).values(input).returning({ id: resultEditRequests.id });
  return Number(res[0]?.id ?? 0);
}

export async function listPendingResultEditRequests() {
  const db = await requireDb();
  return db.select().from(resultEditRequests).where(eq(resultEditRequests.status, "PENDING")).orderBy(resultEditRequests.createdAt);
}

export async function resolveResultEditRequest(id: number, status: "APPROVED" | "REJECTED", resolvedBy: string) {
  const db = await requireDb();
  await db.update(resultEditRequests).set({ status, resolvedAt: new Date(), resolvedBy }).where(eq(resultEditRequests.id, id));
}

export async function nextRegistrationNumber(year: number) {
  const db = await requireDb();
  const existing = await db.select({ regNumber: students.regNumber }).from(students).where(like(students.regNumber, `${year}/%`));
  const max = existing.reduce((highest, row) => {
    const sequence = Number(row.regNumber.split("/")[1] ?? 0);
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `${year}/${String(max + 1).padStart(3, "0")}`;
}

export async function nextStaffIdentifier(fullName: string) {
  const db = await requireDb();
  const base = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "staff";
  const existing = await db.select({ identifier: users.identifier }).from(users).where(like(users.identifier, `${base}%`));
  if (!existing.some(row => row.identifier === base)) return base;
  let suffix = 2;
  while (existing.some(row => row.identifier === `${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export async function getResultEditRequest(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(resultEditRequests).where(eq(resultEditRequests.id, id)).limit(1);
  return rows[0];
}

