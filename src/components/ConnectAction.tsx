import type { Person } from "../lib/types";
import { setConnection } from "../lib/matchStore";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { IconCheck, IconClock, IconLink } from "./icons";

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
        <Button
          size={size}
          onClick={() => setConnection(person.id, "connected")}
        >
          <IconCheck width={16} height={16} /> Annehmen
        </Button>
      );
    default:
      return (
        <Button
          size={size}
          variant="secondary"
          onClick={() => setConnection(person.id, "requested")}
        >
          <IconLink width={16} height={16} /> Verbinden
        </Button>
      );
  }
}
