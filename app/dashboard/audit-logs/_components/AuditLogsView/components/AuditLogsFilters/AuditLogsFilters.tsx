import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditAction } from "@/core/audit/types";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_OPTIONS } from "../../consts";
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
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={entity ?? ALL}
        onValueChange={(value) =>
          onEntityChange(value === ALL ? undefined : value)
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All entities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All entities</SelectItem>
          {AUDIT_ENTITY_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
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
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actions</SelectItem>
          {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map(
            (option) => (
              <SelectItem key={option} value={option}>
                {AUDIT_ACTION_LABELS[option]}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
