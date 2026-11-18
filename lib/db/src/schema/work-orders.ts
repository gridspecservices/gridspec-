import { createInsertSchema } from "drizzle-zod";
import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { assetsTable } from "./assets";

export const workOrdersTable = pgTable("gridlens_work_orders", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assetsTable.id, { onDelete: "cascade" }),
  issue: text("issue").notNull(),
  priority: text("priority").notNull(),
  crew: text("crew").notNull().default("Unassigned"),
  status: text("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewer: text("reviewer").notNull().default("Unassigned"),
});

export const insertWorkOrderSchema = createInsertSchema(workOrdersTable).omit({
  createdAt: true,
});
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrdersTable.$inferSelect;
