"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@fanvue/ui";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6">
      <Card hierarchy="primary" type="header-only">
        <CardHeader>
          <CardTitle>This screen could not be loaded</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="typography-body-default-16px-regular">
            The workspace is still there. Retry the page, or return to the connection screen if the problem continues.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" size="40" onClick={() => reset()}>
              Try again
            </Button>
            <Button asChild variant="secondary" size="40">
              <a href="/workspace/connection">Connection</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
