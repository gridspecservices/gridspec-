import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { assetsTable } from "./assets";
import { usersTable } from "./auth";

export const assetPhotosTable = pgTable("gridlens_asset_photos", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assetsTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull().unique(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetPhotoSchema = createInsertSchema(assetPhotosTable).omit({
  createdAt: true,
});
export type InsertAssetPhoto = z.infer<typeof insertAssetPhotoSchema>;
export type StoredAssetPhoto = typeof assetPhotosTable.$inferSelect;
