import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/chrome";
import { workspaceGate } from "@/lib/workspace-gate";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const gate = await workspaceGate();
  if (gate.kind === "expired") redirect("/connect?error=expired");
  if (gate.kind !== "ready") redirect("/connect");
  return (
    <>
      {children}
      <div style={{ width: "min(1180px, calc(100% - 1.5rem))", margin: "0 auto" }}>
        <SiteFooter />
      </div>
    </>
  );
}
