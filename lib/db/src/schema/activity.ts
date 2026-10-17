import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const activityTable = pgTable("gridlens_activity", {
  id: text("id").primaryKey(),
  time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
});

export const insertActivitySchema = createInsertSchema(activityTable);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;
