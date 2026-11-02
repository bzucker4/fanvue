import Link from "next/link";
import { SiteHeader } from "@/components/chrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="section">
        <div className="card stack">
          <h1>That page is not here</h1>
          <p>The link may be old, or the bundle belongs to a different workspace.</p>
          <Link className="button" href="/">
            Back to the start
          </Link>
        </div>
      </main>
    </>
  );
}
