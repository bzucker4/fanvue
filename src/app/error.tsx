"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@fanvue/ui";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6">
      <Card hierarchy="primary" type="header-only">
        <CardHeader>
          <CardTitle>This page could not be loaded</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="typography-body-default-16px-regular">
            The request failed on the server. Retry it, or contact support. A failure here does not open the sample
            workspace and does not invent an audit result.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" size="40" onClick={() => reset()}>
              Try again
            </Button>
            <Button asChild variant="secondary" size="40">
              <a href="/support">Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
