import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import GanttChart from "./pages/GanttChart";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";
import Team from "./pages/Team";
import Home from "./pages/Home";
import InternalQuestions from "./pages/InternalQuestions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/tasks">
        <DashboardLayout>
          <Tasks />
        </DashboardLayout>
      </Route>
      <Route path="/gantt">
        <DashboardLayout>
          <GanttChart />
        </DashboardLayout>
      </Route>
      <Route path="/documents">
        <DashboardLayout>
          <Documents />
        </DashboardLayout>
      </Route>
      <Route path="/chat">
        <DashboardLayout>
          <Chat />
        </DashboardLayout>
      </Route>
      <Route path="/team">
        <DashboardLayout>
          <Team />
        </DashboardLayout>
      </Route>
      <Route path="/internal-questions">
        <DashboardLayout>
          <InternalQuestions />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
