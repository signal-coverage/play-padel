-- Raw structured params behind a notification's title/message (see
-- prisma/schema.prisma's Notification.params doc comment) — lets
-- notification content be re-rendered live in the viewer's CURRENT locale
-- on every read, instead of staying frozen in whatever language it was
-- dispatched in. Nullable: every existing row predates this column and has
-- no params to re-render from — those simply keep showing their
-- originally-baked title/message.
ALTER TABLE "notifications" ADD COLUMN "params" JSONB;
