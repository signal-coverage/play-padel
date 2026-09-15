import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTION_VALUES, AUDIT_ENTITY_OPTIONS } from "../../consts";
import { getActionLabel } from "../../utils";
import type { AuditLogsFiltersProps } from "./types";

// Radix Select can't use an empty string as an item value, so "show
// everything" needs its own sentinel that gets mapped back to undefined.
const ALL = "all";

export function AuditLogsFilters({
  entity,
  action,
  onEntityChange,
  onActionChange,
}: AuditLogsFiltersProps) {
  const t = useTranslations("AuditLogsFilters");
  const tActionLabels = useTranslations("AuditActionLabels");

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={entity ?? ALL}
        onValueChange={(value) =>
          onEntityChange(value === ALL ? undefined : value)
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("allEntities")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allEntities")}</SelectItem>
          {AUDIT_ENTITY_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`entities.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={action ?? ALL}
        onValueChange={(value) =>
          onActionChange(value === ALL ? undefined : value)
        }
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder={t("allActions")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allActions")}</SelectItem>
          {AUDIT_ACTION_VALUES.map((option) => (
            <SelectItem key={option} value={option}>
              {getActionLabel(option, tActionLabels)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
