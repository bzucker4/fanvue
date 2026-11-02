import { Badge } from "@fanvue/ui";
import { describeCheckedHistory } from "@/lib/coverage-label";

export function CoverageStatus({
  mode,
  status,
  historyComplete,
  broadcastsIncluded,
  chatsDiscovered,
  chatsImported,
  messagesScanned,
  synchronizedAtLabel,
}: {
  mode: string;
  status: string | null;
  historyComplete: boolean;
  broadcastsIncluded: boolean;
  chatsDiscovered: number;
  chatsImported: number;
  messagesScanned: number;
  synchronizedAtLabel: string | null;
}) {
  const labels = describeCheckedHistory({
    mode,
    status,
    historyComplete,
    broadcastsIncluded,
    chatsDiscovered,
    chatsImported,
    messagesScanned,
    synchronizedAtLabel,
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" aria-label="Import coverage">
        <Badge variant={historyComplete && synchronizedAtLabel ? "successColour" : "warningColour"} leftDot>
          {labels.historyLabel}
        </Badge>
        <Badge variant={broadcastsIncluded ? "infoColour" : "warningColour"} leftDot>
          {labels.broadcastLabel}
        </Badge>
      </div>
      <p className="typography-body-default-16px-regular text-content-primary">{labels.summary}</p>
    </div>
  );
}
