import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAuditLog,
  createCredentialNotification,
  createResultEditRequest,
  createUser,
  deleteClass,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteTimetable,
  deleteUser,
  findStudentById,
  findTeacherById,
  getDashboardCounts,
  getResultEditRequest,
  getStudentByUserId,
  getTeacherByUserId,
  getUnifiedAuditLog,
  insertAttendance,
  insertClass,
  insertPromotionRecord,
  insertResult,
  insertStudent,
  insertSubject,
  insertTeacher,
  insertTimetable,
  listAttendance,
  listClassGroups,
  listPendingResultEditRequests,
  listPromotionRecords,
  listResults,
  listStudents,
  listSubjects,
  listTeachers,
  listTimetable,
  nextRegistrationNumber,
  nextStaffIdentifier,
  resolveResultEditRequest,
  updateClass,
  updateResult,
  updateStudent,
  updateSubject,
  updateTeacher,
  updateTimetable,
} from "./db";
import { parseStudentsCsv } from "./csv";
import { deliverCredentials } from "./credentialDelivery";

const pageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(20),
  search: z.string().trim().optional(),
});

const gender = z.enum(["MALE", "FEMALE"]);
const roleProcedure = (roles: Array<"admin" | "teacher" | "student" | "user">) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this school workflow." });
    }
    return next({ ctx });
  });
const adminOrTeacherProcedure = roleProcedure(["admin", "teacher"]);
const actorName = (ctx: { user: { name: string | null; email: string | null; openId: string } }) => ctx.user.name || ctx.user.email || ctx.user.openId;

async function createStudentAccount(input: {
  fullName: string;
  email: string;
  gender: "MALE" | "FEMALE";
  gradeLevel: number;
  classGroupId?: number;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  regNumber?: string;
}, actor: string) {
  const year = new Date().getFullYear();
  const regNumber = input.regNumber || await nextRegistrationNumber(year);
  const delivery = await deliverCredentials({ recipient: input.email, displayName: input.fullName, identifier: regNumber, roleLabel: "Student" });
  if (delivery.status !== "SENT") throw new TRPCError({ code: "PRECONDITION_FAILED", message: delivery.errorMessage || "Credential email could not be sent." });
  const userId = await createUser({ openId: `school-student-${regNumber.replace(/[^a-zA-Z0-9]/g, "-")}`, identifier: regNumber, name: input.fullName, email: input.email, role: "student", passwordHash: delivery.temporaryPasswordHash, mustResetPassword: true });
  const studentId = await insertStudent({ userId, regNumber, fullName: input.fullName, gender: input.gender, gradeLevel: input.gradeLevel, classGroupId: input.classGroupId, guardianName: input.guardianName, guardianPhone: input.guardianPhone, guardianEmail: input.guardianEmail, graduated: false });
  await createCredentialNotification({ userId, recipient: input.email, identifier: regNumber, temporaryPasswordHash: delivery.temporaryPasswordHash, channel: "EMAIL", status: "SENT" });
  await createAuditLog({ actorName: actor, action: "STUDENT_CREATE", details: JSON.stringify({ studentId, regNumber, fullName: input.fullName }), entityType: "Student", entityId: studentId });
  return { studentId, identifier: regNumber, deliveryStatus: "SENT" as const };
}

async function createTeacherAccount(input: { fullName: string; email: string; phone?: string }, actor: string) {
  const identifier = await nextStaffIdentifier(input.fullName);
  const delivery = await deliverCredentials({ recipient: input.email, displayName: input.fullName, identifier, roleLabel: "Teacher" });
  if (delivery.status !== "SENT") throw new TRPCError({ code: "PRECONDITION_FAILED", message: delivery.errorMessage || "Credential email could not be sent." });
  const userId = await createUser({ openId: `school-teacher-${identifier}`, identifier, name: input.fullName, email: input.email, role: "teacher", passwordHash: delivery.temporaryPasswordHash, mustResetPassword: true });
  const teacherId = await insertTeacher({ userId, fullName: input.fullName, email: input.email, phone: input.phone });
  await createCredentialNotification({ userId, recipient: input.email, identifier, temporaryPasswordHash: delivery.temporaryPasswordHash, channel: "EMAIL", status: "SENT" });
  await createAuditLog({ actorName: actor, action: "TEACHER_CREATE", details: JSON.stringify({ teacherId, identifier, fullName: input.fullName }), entityType: "Teacher", entityId: teacherId });
  return { teacherId, identifier, deliveryStatus: "SENT" as const };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    summary: protectedProcedure.query(() => getDashboardCounts()),
    myProfile: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "student") return getStudentByUserId(ctx.user.id);
      if (ctx.user.role === "teacher") return getTeacherByUserId(ctx.user.id);
      return ctx.user;
    }),
  }),

  students: router({
    list: protectedProcedure.input(pageInput.extend({ gradeLevel: z.number().int().min(1).max(4).optional(), classGroupId: z.number().int().positive().optional() })).query(({ input }) => listStudents(input)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => findStudentById(input.id)),
    create: adminProcedure.input(z.object({ fullName: z.string().trim().min(2), email: z.string().email(), gender, gradeLevel: z.number().int().min(1).max(4), classGroupId: z.number().int().positive().optional(), guardianName: z.string().trim().optional(), guardianPhone: z.string().trim().optional(), guardianEmail: z.string().email().optional(), regNumber: z.string().trim().optional() })).mutation(({ input, ctx }) => createStudentAccount(input, actorName(ctx))),
    bulkImport: adminProcedure.input(z.object({ csv: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      const parsed = parseStudentsCsv(input.csv);
      const errors = [...parsed.errors];
      let imported = 0;
      for (const row of parsed.rows) {
        try {
          await createStudentAccount(row, actorName(ctx));
          imported += 1;
        } catch (error) {
          errors.push({ rowNumber: row.rowNumber, message: error instanceof Error ? error.message : "Could not create account." });
        }
      }
      return { imported, failed: errors.length, errors };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), fullName: z.string().trim().min(2).optional(), gender: gender.optional(), gradeLevel: z.number().int().min(1).max(4).optional(), classGroupId: z.number().int().positive().nullable().optional(), guardianName: z.string().trim().nullable().optional(), guardianPhone: z.string().trim().nullable().optional(), guardianEmail: z.string().email().nullable().optional() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      await updateStudent(id, changes);
      await createAuditLog({ actorName: actorName(ctx), action: "STUDENT_UPDATE", details: JSON.stringify(changes), entityType: "Student", entityId: id });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const existing = await findStudentById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
      await deleteStudent(input.id);
      await deleteUser(existing.userId);
      await createAuditLog({ actorName: actorName(ctx), action: "STUDENT_DELETE", details: JSON.stringify({ fullName: existing.fullName, regNumber: existing.regNumber }), entityType: "Student", entityId: input.id });
      return { success: true };
    }),
  }),

  teachers: router({
    list: protectedProcedure.input(pageInput).query(({ input }) => listTeachers(input)),
    create: adminProcedure.input(z.object({ fullName: z.string().trim().min(2), email: z.string().email(), phone: z.string().trim().optional() })).mutation(({ input, ctx }) => createTeacherAccount(input, actorName(ctx))),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), fullName: z.string().trim().min(2).optional(), email: z.string().email().optional(), phone: z.string().trim().nullable().optional() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      await updateTeacher(id, changes);
      await createAuditLog({ actorName: actorName(ctx), action: "TEACHER_UPDATE", details: JSON.stringify(changes), entityType: "Teacher", entityId: id });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const existing = await findTeacherById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Teacher not found." });
      await deleteTeacher(input.id);
      await deleteUser(existing.userId);
      await createAuditLog({ actorName: actorName(ctx), action: "TEACHER_DELETE", details: JSON.stringify({ fullName: existing.fullName }), entityType: "Teacher", entityId: input.id });
      return { success: true };
    }),
  }),

  classes: router({
    list: protectedProcedure.input(pageInput).query(({ input }) => listClassGroups(input)),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2), gradeLevel: z.number().int().min(1).max(4), classTeacherId: z.number().int().positive().nullable().optional() })).mutation(async ({ input, ctx }) => {
      const id = await insertClass(input);
      await createAuditLog({ actorName: actorName(ctx), action: "CLASS_CREATE", details: JSON.stringify(input), entityType: "ClassGroup", entityId: id });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).optional(), gradeLevel: z.number().int().min(1).max(4).optional(), classTeacherId: z.number().int().positive().nullable().optional() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      await updateClass(id, changes);
      await createAuditLog({ actorName: actorName(ctx), action: "CLASS_UPDATE", details: JSON.stringify(changes), entityType: "ClassGroup", entityId: id });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await deleteClass(input.id);
      await createAuditLog({ actorName: actorName(ctx), action: "CLASS_DELETE", details: JSON.stringify({}), entityType: "ClassGroup", entityId: input.id });
      return { success: true };
    }),
  }),

  subjects: router({
    list: protectedProcedure.input(pageInput.extend({ gradeLevel: z.number().int().min(1).max(4).optional() })).query(({ input }) => listSubjects(input)),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2), code: z.string().trim().min(2).max(50), gradeLevel: z.number().int().min(1).max(4) })).mutation(async ({ input, ctx }) => {
      const id = await insertSubject(input);
      await createAuditLog({ actorName: actorName(ctx), action: "SUBJECT_CREATE", details: JSON.stringify(input), entityType: "Subject", entityId: id });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).optional(), code: z.string().trim().min(2).max(50).optional(), gradeLevel: z.number().int().min(1).max(4).optional() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      await updateSubject(id, changes);
      await createAuditLog({ actorName: actorName(ctx), action: "SUBJECT_UPDATE", details: JSON.stringify(changes), entityType: "Subject", entityId: id });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await deleteSubject(input.id);
      await createAuditLog({ actorName: actorName(ctx), action: "SUBJECT_DELETE", details: JSON.stringify({}), entityType: "Subject", entityId: input.id });
      return { success: true };
    }),
  }),

  timetable: router({
    list: protectedProcedure.input(z.object({ classGroupId: z.number().int().positive().optional() })).query(({ input }) => listTimetable(input.classGroupId)),
    create: adminProcedure.input(z.object({ classGroupId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherId: z.number().int().positive(), dayOfWeek: z.number().int().min(1).max(7), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) })).mutation(async ({ input, ctx }) => {
      const id = await insertTimetable(input);
      await createAuditLog({ actorName: actorName(ctx), action: "TIMETABLE_CREATE", details: JSON.stringify(input), entityType: "TimetableEntry", entityId: id });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), classGroupId: z.number().int().positive().optional(), subjectId: z.number().int().positive().optional(), teacherId: z.number().int().positive().optional(), dayOfWeek: z.number().int().min(1).max(7).optional(), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      await updateTimetable(id, changes);
      await createAuditLog({ actorName: actorName(ctx), action: "TIMETABLE_UPDATE", details: JSON.stringify(changes), entityType: "TimetableEntry", entityId: id });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await deleteTimetable(input.id);
      await createAuditLog({ actorName: actorName(ctx), action: "TIMETABLE_DELETE", details: JSON.stringify({}), entityType: "TimetableEntry", entityId: input.id });
      return { success: true };
    }),
  }),

  attendance: router({
    list: adminOrTeacherProcedure.input(z.object({ classGroupId: z.number().int().positive().optional(), date: z.string().optional() })).query(({ input }) => listAttendance(input)),
    mark: adminOrTeacherProcedure.input(z.object({ classGroupId: z.number().int().positive(), date: z.string(), records: z.array(z.object({ studentId: z.number().int().positive(), status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]) })).min(1) })).mutation(async ({ input, ctx }) => {
      for (const record of input.records) await insertAttendance({ studentId: record.studentId, classGroupId: input.classGroupId, date: input.date, status: record.status, recordedById: ctx.user.id });
      await createAuditLog({ actorName: actorName(ctx), action: "ATTENDANCE_MARK", details: JSON.stringify({ classGroupId: input.classGroupId, date: input.date, count: input.records.length }), entityType: "Attendance", entityId: input.classGroupId });
      return { saved: input.records.length };
    }),
  }),

  results: router({
    list: protectedProcedure.input(z.object({ studentId: z.number().int().positive().optional(), term: z.string().trim().optional() })).query(({ input }) => listResults(input)),
    create: adminOrTeacherProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive(), recordedById: z.number().int().positive(), title: z.string().trim().min(2), score: z.number().min(0), maxScore: z.number().positive().default(100), term: z.string().trim().min(2) })).mutation(async ({ input, ctx }) => {
      if (input.score > input.maxScore) throw new TRPCError({ code: "BAD_REQUEST", message: "Score cannot exceed the maximum score." });
      const id = await insertResult(input);
      await createAuditLog({ actorName: actorName(ctx), action: "RESULT_CREATE", details: JSON.stringify(input), entityType: "Result", entityId: id });
      return { id };
    }),
    requestEdit: adminOrTeacherProcedure.input(z.object({ resultId: z.number().int().positive(), requestedById: z.number().int().positive(), newScore: z.number().min(0), newMaxScore: z.number().positive(), newTitle: z.string().trim().min(2), newTerm: z.string().trim().min(2), reason: z.string().trim().optional() })).mutation(async ({ input, ctx }) => {
      if (input.newScore > input.newMaxScore) throw new TRPCError({ code: "BAD_REQUEST", message: "New score cannot exceed the maximum score." });
      const id = await createResultEditRequest({ ...input, status: "PENDING" });
      await createAuditLog({ actorName: actorName(ctx), action: "RESULT_EDIT_REQUEST", details: JSON.stringify(input), entityType: "ResultEditRequest", entityId: id });
      return { id, status: "PENDING" as const };
    }),
    pendingEdits: adminProcedure.query(() => listPendingResultEditRequests()),
    resolveEdit: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["APPROVED", "REJECTED"]) })).mutation(async ({ input, ctx }) => {
      const request = await getResultEditRequest(input.id);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Edit request not found." });
      if (input.decision === "APPROVED") await updateResult(request.resultId, { score: request.newScore, maxScore: request.newMaxScore, title: request.newTitle, term: request.newTerm });
      await resolveResultEditRequest(input.id, input.decision, actorName(ctx));
      await createAuditLog({ actorName: actorName(ctx), action: `RESULT_EDIT_${input.decision}`, details: JSON.stringify({ resultId: request.resultId }), entityType: "ResultEditRequest", entityId: input.id });
      return { success: true };
    }),
  }),

  promotion: router({
    list: adminOrTeacherProcedure.input(z.object({ studentId: z.number().int().positive().optional() })).query(({ input }) => listPromotionRecords(input.studentId)),
    promote: adminProcedure.input(z.object({ studentId: z.number().int().positive(), term: z.string().trim().min(2), averageScore: z.number().min(0).max(100), previousGrade: z.number().int().min(1).max(4), newGrade: z.number().int().min(1).max(4), promoted: z.boolean(), graduated: z.boolean().default(false) })).mutation(async ({ input, ctx }) => {
      const student = await findStudentById(input.studentId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
      await updateStudent(input.studentId, { gradeLevel: input.newGrade, graduated: input.graduated });
      await insertPromotionRecord(input);
      await createAuditLog({ actorName: actorName(ctx), action: input.graduated ? "GRADUATION" : "PROMOTION", details: JSON.stringify(input), entityType: "PromotionRecord", entityId: input.studentId });
      return { success: true };
    }),
  }),

  audit: router({
    list: adminProcedure.input(pageInput).query(({ input }) => getUnifiedAuditLog(input)),
  }),
});

export type AppRouter = typeof appRouter;
