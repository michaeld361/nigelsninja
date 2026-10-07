import { Shell } from "@/components/shell";
import { requireSession } from "@/lib/auth";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <Shell name={session.name} role={session.role}>
      {children}
    </Shell>
  );
}
