import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/layout/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav user={user} />
      {children}
    </>
  );
}
