import CDEShell from "@/components/cde/CDEShell";

export const metadata = {
  title: "Harmony Fire CDE",
  description: "Common Data Environment — Harmony Fire Limited",
};

export default function CDELayout({ children }: { children: React.ReactNode }) {
  return <CDEShell>{children}</CDEShell>;
}
