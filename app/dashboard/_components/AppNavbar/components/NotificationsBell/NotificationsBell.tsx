"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBox } from "@/components/StatusBox";
import { useMarkAllAsRead, useNotifications } from "./hooks";

export function NotificationsBell() {
  const { data, isLoading } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <span className="relative hidden sm:inline-flex">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon-lg"
            title="Notifications"
            className="rounded-full"
          >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-80 gap-0 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => markAllAsRead.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <StatusBox className="rounded-none border-none">
                Loading…
              </StatusBox>
            ) : notifications.length === 0 ? (
              <StatusBox className="rounded-none border-none">
                No notifications yet
              </StatusBox>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0"
                >
                  {!notification.readAt && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {unreadCount > 0 && (
        <span
          data-testid="notifications-unread-indicator"
          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive"
        />
      )}
    </span>
  );
}
