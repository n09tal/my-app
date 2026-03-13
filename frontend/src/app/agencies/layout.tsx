import AppShell from "@/components/AppShell";

export default function AgenciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
