import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export type AssetPhoto = { name: string; url: string };

export const assetsTable = pgTable("gridlens_assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  structureId: text("structure_id").notNull(),
  circuit: text("circuit").notNull(),
  inspectionDate: date("inspection_date", { mode: "string" }).notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  defectType: text("defect_type").notNull(),
  severity: text("severity").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  notes: text("notes").notNull().default(""),
  utility: text("utility").notNull(),
  reviewed: boolean("reviewed").notNull().default(false),
  demo: boolean("demo").notNull().default(false),
  photos: jsonb("photos").$type<AssetPhoto[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({
  createdAt: true,
});
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
