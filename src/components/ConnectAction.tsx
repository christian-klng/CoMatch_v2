import { useState } from "react";
import type { ConnectionStatus, Person } from "../lib/types";
import { acceptConnection, requestConnection } from "../lib/matchStore";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { IconCheck, IconClock, IconLink } from "./icons";

/** Read-only connection status for the match list — actions (request/accept)
 *  live on the person's detail page only. Renders nothing for "none". */
export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case "connected":
      return (
        <Badge tone="success">
          <IconCheck width={13} height={13} /> Verbunden
        </Badge>
      );
    case "requested":
      return (
        <Badge tone="warning">
          <IconClock width={13} height={13} /> Anfrage gesendet
        </Badge>
      );
    case "incoming":
      return (
        <Badge tone="brand">
          <IconLink width={13} height={13} /> Anfrage erhalten
        </Badge>
      );
    default:
      return null;
  }
}

/**
 * Hybrid matching action surface.
 * none -> request · requested -> pending · incoming -> accept · connected -> done
 */
export function ConnectAction({
  person,
  size = "sm",
}: {
  person: Person;
  size?: "sm" | "md";
}) {
  const [busy, setBusy] = useState(false);

  const run = async (action: (id: string) => Promise<void>) => {
    setBusy(true);
    try {
      await action(person.id);
    } finally {
      setBusy(false);
    }
  };

  switch (person.connection) {
    case "connected":
      return (
        <Badge tone="success">
          <IconCheck width={13} height={13} /> Verbunden
        </Badge>
      );
    case "requested":
      return (
        <Badge tone="warning">
          <IconClock width={13} height={13} /> Anfrage gesendet
        </Badge>
      );
    case "incoming":
      return (
        <Button size={size} disabled={busy} onClick={() => run(acceptConnection)}>
          <IconCheck width={16} height={16} /> Annehmen
        </Button>
      );
    default:
      return (
        <Button
          size={size}
          variant="secondary"
          disabled={busy}
          onClick={() => run(requestConnection)}
        >
          <IconLink width={16} height={16} /> Verbinden
        </Button>
      );
  }
}
