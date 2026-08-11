export type AuditLogsFiltersProps = {
  entity?: string;
  action?: string;
  onEntityChange: (entity?: string) => void;
  onActionChange: (action?: string) => void;
};
