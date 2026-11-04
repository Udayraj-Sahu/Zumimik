import { DashboardShell } from "@/components/shell/dashboard-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}