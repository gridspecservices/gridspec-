import { createInsertSchema } from "drizzle-zod";
import { date, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const projectsTable = pgTable("gridlens_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  utility: text("utility").notNull(),
  circuit: text("circuit").notNull(),
  status: text("status").notNull().default("Active"),
  date: date("inspection_date", { mode: "string" }).notNull(),
  demo: boolean("demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  createdAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
