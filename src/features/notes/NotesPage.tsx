/**
 * Página Quick Notes: reutiliza el panel compartido en modo `inline`.
 */
import { MONTHS, WEEKDAYS } from "../../domain/dates";
import { ItemPanel } from "../../components/ItemPanel/ItemPanel";
import { t } from "../../i18n";
import { PageHeader } from "../../components/ui/PageHeader";

export function NotesPage() {
  const now = new Date();
  const kicker = `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`.toUpperCase();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader eyebrow={kicker} title={t("Quick Notes")} subtitle={t("Capture something before you forget.")} />
      <div data-rise="1" style={{ position: "relative", flex: 1, minHeight: 420, minWidth: 0 }}>
        <ItemPanel inline />
      </div>
    </div>
  );
}
