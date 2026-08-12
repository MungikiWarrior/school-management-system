import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export default function Attendance() {
  const [classGroupId, setClassGroupId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusesByStudent, setStatusesByStudent] = useState<Record<number, typeof statuses[number]>>({});
  const classes = trpc.classes.list.useQuery({ page: 1, pageSize: 50 });
  const students = trpc.students.list.useQuery(useMemo(() => ({ page: 1, pageSize: 100, classGroupId: classGroupId ? Number(classGroupId) : undefined }), [classGroupId]));
  const attendance = trpc.attendance.list.useQuery({ classGroupId: classGroupId ? Number(classGroupId) : undefined, date });
  const mark = trpc.attendance.mark.useMutation({ onSuccess: result => { toast.success(`Saved attendance for ${result.saved} students`); }, onError: error => toast.error("Could not save attendance", { description: error.message }) });
  const existing = useMemo(() => Object.fromEntries((attendance.data ?? []).map(item => [item.studentId, item.status as typeof statuses[number]])), [attendance.data]);
  const selectedClass = classes.data?.rows.find(item => item.id === Number(classGroupId));
  const rows = students.data?.rows ?? [];
  const setStatus = (studentId: number, status: typeof statuses[number]) => setStatusesByStudent(current => ({ ...current, [studentId]: status }));
  const save = () => {
    if (!classGroupId || rows.length === 0) { toast.error("Choose a class with students first"); return; }
    mark.mutate({ classGroupId: Number(classGroupId), date, records: rows.map(student => ({ studentId: student.id, status: statusesByStudent[student.id] || existing[student.id] || "PRESENT" })) });
  };
  return <div className="mx-auto max-w-[1200px] space-y-6 pb-10"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Daily operations</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Attendance</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Mark a class once and keep the record visible for teachers and administrators.</p></div><Button onClick={save} disabled={mark.isPending || rows.length === 0}><CheckCircle2 className="mr-2 h-4 w-4" />{mark.isPending ? "Saving…" : "Save attendance"}</Button></div><Card className="border-border/70 shadow-[0_16px_50px_-30px_rgba(13,35,61,0.55)]"><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Choose the register</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row"><div className="flex-1"><label className="mb-2 block text-sm font-medium">Class group</label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={classGroupId} onChange={event => { setClassGroupId(event.target.value); setStatusesByStudent({}); }}><option value="">Choose a class</option>{classes.data?.rows.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div><div className="flex-1"><label className="mb-2 block text-sm font-medium">Date</label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="date" className="pl-9" value={date} onChange={event => setDate(event.target.value)} /></div></div></CardContent></Card><Card className="border-border/70 shadow-[0_16px_50px_-30px_rgba(13,35,61,0.55)]"><CardHeader><CardTitle>{selectedClass ? `${selectedClass.name} register` : "Attendance register"}</CardTitle><p className="text-sm text-muted-foreground">{selectedClass ? `${rows.length} students · ${new Date(`${date}T00:00:00`).toLocaleDateString()}` : "Choose a class to load its students."}</p></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-border/70 bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-6 py-3">Student</th><th className="px-6 py-3">Reg. no.</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y divide-border/60">{students.isLoading ? <tr><td colSpan={3} className="px-6 py-6"><Skeleton className="h-8 w-full" /></td></tr> : rows.length === 0 ? <tr><td colSpan={3} className="px-6 py-14 text-center text-muted-foreground">Select a class to see its register.</td></tr> : rows.map(student => { const selected = statusesByStudent[student.id] || existing[student.id] || "PRESENT"; return <tr key={student.id}><td className="px-6 py-4 font-semibold">{student.fullName}</td><td className="px-6 py-4 font-mono text-xs">{student.regNumber}</td><td className="px-6 py-4"><div className="flex flex-wrap gap-2">{statuses.map(status => <button key={status} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`} onClick={() => setStatus(student.id, status)}>{status[0] + status.slice(1).toLowerCase()}</button>)}</div></td></tr>; })}</tbody></table></div></CardContent></Card></div>;
}
