"use client";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="section">
      <div className="card stack">
        <h1>This screen could not be loaded</h1>
        <p>The workspace is still there. Retry the page, or return to the connection screen if the problem continues.</p>
        <div className="actions">
          <button className="button" type="button" onClick={() => reset()}>
            Try again
          </button>
          <a className="button-secondary" href="/workspace/connection">
            Connection
          </a>
        </div>
      </div>
    </main>
  );
}
