"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { TennisBallIcon } from "@/components/TennisBallIcon";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBox } from "@/components/StatusBox";
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useNotificationStream,
} from "./hooks";
import { getNotificationHref } from "./utils";

export function NotificationsBell() {
  const { data, isLoading } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();
  const markAsRead = useMarkAsRead();
  useNotificationStream();
  const shouldReduceMotion = useReducedMotion();
  // Controlled (not the uncontrolled default) so clicking a notification
  // link can close the popover itself — AppNavbar stays mounted across a
  // same-app navigation, so nothing else would ever close it otherwise.
  const [open, setOpen] = useState(false);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Re-keying the indicator below on every bump remounts it, which is what
  // actually replays the bounce — a still-mounted motion.span with a fresh
  // `animate` object of the same shape doesn't restart a finished
  // animation. This one counter drives BOTH triggers (the periodic timer
  // below and a hover on the bell), so they can never fight over separate
  // animation state.
  const [bounceCount, setBounceCount] = useState(0);

  useEffect(() => {
    if (unreadCount === 0 || shouldReduceMotion) return;
    const interval = setInterval(() => setBounceCount((c) => c + 1), 7_000);
    return () => clearInterval(interval);
  }, [unreadCount, shouldReduceMotion]);

  function handleBellHover() {
    if (unreadCount === 0 || shouldReduceMotion) return;
    setBounceCount((c) => c + 1);
  }

  return (
    <span className="relative hidden sm:inline-flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon-lg"
            title="Notifications"
            className="rounded-full"
            onMouseEnter={handleBellHover}
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
                <Link
                  key={notification.id}
                  href={getNotificationHref(
                    notification.type,
                    notification.clubId,
                  )}
                  onClick={() => {
                    setOpen(false);
                    if (!notification.readAt) {
                      markAsRead.mutate(notification.id);
                    }
                  }}
                  className="group flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent hover:text-accent-foreground"
                >
                  {!notification.readAt && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{notification.title}</p>
                    {/* text-muted-foreground overrides the Link's own
                        inherited hover:text-accent-foreground (an explicit
                        color class always wins over inheritance), so it
                        needs the group-hover variant explicitly — without
                        it, this line stays --muted-foreground gray against
                        --accent's hover background, which is a poor-to-
                        unreadable pairing in both themes (see
                        app/globals.css: light's --accent is the exact same
                        blue as --foreground; dark's --accent is a bright
                        yellow-green that gray text barely registers on). */}
                    <p className="text-xs text-muted-foreground group-hover:text-accent-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {unreadCount > 0 && (
        // Tennis ball, not a plain static dot — this app's status/severity
        // icon language (see e.g. AdminApprovalsView/AdminClubList's own
        // warning badges) is always the ball, and a bare dot barely
        // registered here per the whole reason this changed. Deliberately
        // NOT the shared BouncingBall (which only ever bounces
        // perpetually, and has 26+ other callers relying on that) — a
        // small badge sitting in a corner of the navbar at all times
        // needs to be periodic, not constant, or it reads as distracting
        // background motion rather than "you have something new". A
        // ~0.6s bounce plays on mount, every ~7s after that, and once more
        // whenever the bell itself is hovered (see handleBellHover above) —
        // `key`d to bounceCount so each bump remounts (and thus replays)
        // this single non-repeating animation rather than fighting a
        // still-running one.
        <motion.span
          key={bounceCount}
          data-testid="notifications-unread-indicator"
          data-bounce-count={bounceCount}
          className="absolute -bottom-1 -left-1 inline-flex"
          animate={
            shouldReduceMotion
              ? undefined
              : { y: [0, -4, 0], scaleX: [1, 1.15, 1], scaleY: [1, 0.85, 1] }
          }
          transition={{
            duration: 0.6,
            ease: "easeInOut",
          }}
        >
          <TennisBallIcon
            size={16}
            fill="var(--destructive)"
            stroke="color-mix(in oklch, var(--destructive) 70%, black)"
          />
        </motion.span>
      )}
    </span>
  );
}
