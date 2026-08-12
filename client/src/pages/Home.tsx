import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MailCheck,
  Plus,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "wouter";

const roleCopy = {
  admin: { eyebrow: "Administration cockpit", title: "Keep every school workflow moving.", description: "A calm operating view for people, classes, curriculum, outcomes, and the decisions that need a paper trail." },
  teacher: { eyebrow: "Teaching cockpit", title: "Your classes, ready for the day.", description: "Move from attendance to results without losing context, and send every important change through the right approval path." },
  student: { eyebrow: "Student space", title: "See your school life clearly.", description: "Your academic record, timetable, and attendance in one focused place." },
  user: { eyebrow: "School operations", title: "A clearer way to run the school.", description: "Bring the daily administrative rhythm into one dependable workspace." },
};

function MetricCard({ label, value, detail, icon: Icon, accent }: { label: string; value?: number; detail: string; icon: typeof Users; accent: string }) {
  return <Card className="border-border/70 bg-card/80 shadow-[0_16px_50px_-30px_rgba(13,35,61,0.55)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{label}</p>{value === undefined ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>}<p className="mt-2 text-xs text-muted-foreground">{detail}</p></div><div className={`rounded-2xl p-3 ${accent}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>;
}

export default function Home() {
  const { user } = useAuth();
  const summary = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const role = (user?.role ?? "user") as keyof typeof roleCopy;
  const copy = roleCopy[role] ?? roleCopy.user;
  const isAdmin = role === "admin" || role === "user";
  const recentAudit = summary.data?.recentAudit ?? [];

  return <div className="mx-auto max-w-[1500px] space-y-8 px-1 pb-10 pt-2">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#0d233d] px-6 py-8 text-white shadow-[0_24px_70px_-35px_rgba(13,35,61,0.8)] sm:px-10 sm:py-10"><div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#9fe4cf]/20 blur-3xl" /><div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#efc47d]/10 blur-3xl" /><div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div className="max-w-3xl"><div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#bcefe1]"><Sparkles className="h-4 w-4" /><span>{copy.eyebrow}</span><Badge className="ml-1 border-white/15 bg-white/10 text-white hover:bg-white/10">{role}</Badge></div><h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{copy.title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{copy.description}</p></div><div className="flex flex-wrap gap-3">{isAdmin && <Link href="/students"><Button className="bg-[#bcefe1] text-[#0d233d] hover:bg-white"><Plus className="mr-2 h-4 w-4" />Add a student</Button></Link>}<Link href="/timetable"><Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><CalendarDays className="mr-2 h-4 w-4" />Open timetable</Button></Link></div></div></section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Active students" value={summary.data?.students} detail="Currently enrolled learners" icon={GraduationCap} accent="bg-[#e5f7f1] text-[#1c806d]" /><MetricCard label="Teaching staff" value={summary.data?.teachers} detail="People with teaching access" icon={Users} accent="bg-[#fcefdc] text-[#a4671d]" /><MetricCard label="Classes" value={summary.data?.classes} detail="Class groups in the school" icon={School} accent="bg-[#e9eefb] text-[#4268b3]" /><MetricCard label="Pending result edits" value={summary.data?.pendingEdits} detail="Awaiting an approval decision" icon={ShieldCheck} accent="bg-[#f7e6ea] text-[#a84d60]" /></section>

    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><Card className="border-border/70 bg-card/80 shadow-[0_16px_50px_-30px_rgba(13,35,61,0.55)]"><CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-6 pb-3 pt-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Workspace pulse</p><CardTitle className="mt-2 text-xl tracking-tight">A short path to the work that matters</CardTitle></div><Activity className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent className="grid gap-3 px-6 pb-6 sm:grid-cols-2"><QuickAction href="/students" icon={Users} title={role === "student" ? "View my academic record" : "Review student records"} detail="Search, filter, and keep the roster current." /><QuickAction href="/results" icon={BookOpen} title={role === "student" ? "Open my results" : "Review results workflow"} detail="Protect published marks with a clear approval trail." /><QuickAction href="/attendance" icon={ClipboardCheck} title="Check attendance" detail="See daily presence by class and date." /><QuickAction href="/audit" icon={ShieldCheck} title="Inspect the audit log" detail="Understand who changed what and when." /></CardContent></Card><Card className="border-border/70 bg-[#f9f6ef] shadow-[0_16px_50px_-30px_rgba(13,35,61,0.45)]"><CardHeader className="px-6 pb-3 pt-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a4671d]">Guardrails</p><CardTitle className="mt-2 text-xl tracking-tight">Trust built into the workflow</CardTitle></div><MailCheck className="h-5 w-5 text-[#a4671d]" /></div></CardHeader><CardContent className="space-y-4 px-6 pb-6 text-sm text-muted-foreground"><Guardrail title="Credentials are delivered, not displayed" detail="New account credentials are sent by email and never returned to the browser." /><Guardrail title="Edits stay reviewable" detail="Result changes create an approval request before a published mark changes." /><Guardrail title="Lifecycle events stay visible" detail="Promotion, graduation, and administrative activity converge in one audit view." /></CardContent></Card></section>

    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]"><Card className="border-border/70 bg-card/80 shadow-[0_16px_50px_-30px_rgba(13,35,61,0.55)]"><CardHeader className="px-6 pb-3 pt-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Today’s rhythm</p><CardTitle className="mt-2 text-xl tracking-tight">Make the next action obvious</CardTitle></CardHeader><CardContent className="space-y-3 px-6 pb-6"><RhythmItem icon={CalendarDays} label="Weekly timetable" detail="See the entire week as a grid, not a list." href="/timetable" /><RhythmItem icon={ClipboardCheck} label="Daily attendance" detail="Mark a class once, then keep the record visible." href="/attendance" /><RhythmItem icon={CheckCircle2} label="Approval queue" detail="Resolve result edits with context and reason." href="/results" /></CardContent></Card><Card className="border-border/70 bg-card/80 shadow-[0_16px_50px_-30px_rgba(13,35,61,0.55)]"><CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-6 pb-3 pt-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Latest trace</p><CardTitle className="mt-2 text-xl tracking-tight">Recent activity</CardTitle></div><Link href="/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Full log <ArrowUpRight className="h-4 w-4" /></Link></CardHeader><CardContent className="px-6 pb-6">{summary.isLoading ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : recentAudit.length === 0 ? <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">No activity recorded yet. Once the school starts using the workflows, the latest actions will appear here.</div> : <div className="space-y-2">{recentAudit.map(item => <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-3"><div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.action}</p><p className="truncate text-xs text-muted-foreground">{item.actorName} · {item.entityType}</p></div><span className="shrink-0 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span></div>)}</div>}</CardContent></Card></section>
  </div>;
}

function QuickAction({ href, icon: Icon, title, detail }: { href: string; icon: typeof Users; title: string; detail: string }) { return <Link href={href} className="group rounded-2xl border border-border/70 bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.035] hover:shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="font-semibold tracking-tight">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div></Link>; }
function RhythmItem({ href, icon: Icon, label, detail }: { href: string; icon: typeof Users; label: string; detail: string }) { return <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 transition hover:border-primary/30"><div className="rounded-xl bg-[#e5f7f1] p-2.5 text-[#1c806d]"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>; }
function Guardrail({ title, detail }: { title: string; detail: string }) { return <div className="flex gap-3"><div className="mt-0.5 rounded-full bg-[#e8ddc9] p-1.5 text-[#a4671d]"><CheckCircle2 className="h-3.5 w-3.5" /></div><div><p className="font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-5">{detail}</p></div></div>; }
