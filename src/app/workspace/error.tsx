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
            The workspace is still there. This is not an empty purchase history and it is not a completed audit. Retry
            the page, return to the connection screen, or contact support.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" size="40" onClick={() => reset()}>
              Try again
            </Button>
            <Button asChild variant="secondary" size="40">
              <a href="/workspace/connection">Connection</a>
            </Button>
            <Button asChild variant="tertiary" size="40">
              <a href="/support">Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
