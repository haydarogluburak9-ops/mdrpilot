import { DemoTourShell } from "./demo-tour-shell";

export default function DemoTourLayout({ children }: { children: React.ReactNode }) {
  return <DemoTourShell>{children}</DemoTourShell>;
}
