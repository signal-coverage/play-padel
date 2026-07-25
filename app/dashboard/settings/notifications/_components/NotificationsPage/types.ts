import type {
  NotificationType,
  NotificationStatus,
} from "@/core/notifications/types";

export interface NotificationsPageProps {}

export interface NotificationFiltersState {
  type?: NotificationType;
  status?: NotificationStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
}
