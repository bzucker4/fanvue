import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/chrome";
import { requireWorkspace } from "@/lib/workspace-gate";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const workspace = await requireWorkspace();
  if (!workspace) redirect("/connect");
  return (
    <>
      {children}
      <div style={{ width: "min(1180px, calc(100% - 1.5rem))", margin: "0 auto" }}>
        <SiteFooter />
      </div>
    </>
  );
}
