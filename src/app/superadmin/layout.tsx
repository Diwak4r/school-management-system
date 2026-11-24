import SuperAdminShell from "@/components/superadmin/Shell";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform control | ShikshaSetu",
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlatformAdmin();

  return (
    <SuperAdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      {children}
    </SuperAdminShell>
  );
}
