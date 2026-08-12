import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Audit from "@/pages/Audit";
import Attendance from "@/pages/Attendance";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Promotion from "@/pages/Promotion";
import Results from "@/pages/Results";
import Staff from "@/pages/Staff";
import Students from "@/pages/Students";
import Subjects from "@/pages/Subjects";
import Timetable from "@/pages/Timetable";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/students" component={Students} /><Route path="/staff" component={Staff} /><Route path="/subjects" component={Subjects} /><Route path="/timetable" component={Timetable} /><Route path="/attendance" component={Attendance} /><Route path="/results" component={Results} /><Route path="/promotion" component={Promotion} /><Route path="/audit" component={Audit} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout>;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
