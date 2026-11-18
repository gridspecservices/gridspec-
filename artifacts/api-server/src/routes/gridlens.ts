import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateAssetPhotoBody,
  CreateAssetPhotoParams,
  CreateAssetPhotoResponse,
  CreateProjectBody,
  CreateProjectResponse,
  CreateWorkOrderBody,
  CreateWorkOrderResponse,
  GetSummaryResponse,
  GetWorkspaceResponse,
  LoadDemoResponse,
  UpdateAssetBody,
  UpdateAssetParams,
  UpdateAssetResponse,
  UpdateWorkOrderBody,
  UpdateWorkOrderParams,
  UpdateWorkOrderResponse,
} from "@workspace/api-zod";
import {
  assetsTable,
  assetPhotosTable,
  db,
  projectsTable,
  workOrdersTable,
} from "@workspace/db";
import {
  getSummaryData,
  getWorkspaceData,
  recordActivity,
  seedDemoData,
  transitionWorkOrder,
} from "../lib/gridlens";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 25 * 1024 * 1024;

router.get("/workspace", async (req, res): Promise<void> => {
  req.log.info("Fetching GridLens workspace");
  const workspace = await getWorkspaceData(req.isAuthenticated());
  res.json(GetWorkspaceResponse.parse(workspace));
});

router.post("/assets/:id/photos", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to attach inspection images." });
    return;
  }
  const params = CreateAssetPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateAssetPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { objectPath, name, size, contentType } = parsed.data;
  if (
    !objectPath.startsWith("/objects/uploads/") ||
    !allowedPhotoTypes.has(contentType) ||
    size > maxPhotoBytes
  ) {
    res.status(400).json({ error: "Unsupported inspection image." });
    return;
  }
  const [asset] = await db.select({ id: assetsTable.id })
    .from(assetsTable)
    .where(eq(assetsTable.id, params.data.id))
    .limit(1);
  if (!asset) {
    res.status(404).json({ error: "Finding not found." });
    return;
  }
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();
    if (
      Number(metadata.size) !== size ||
      metadata.contentType !== contentType
    ) {
      res.status(400).json({ error: "Uploaded image details do not match the file." });
      return;
    }
    const [existingPhoto] = await db.select({ id: assetPhotosTable.id })
      .from(assetPhotosTable)
      .where(eq(assetPhotosTable.objectPath, objectPath))
      .limit(1);
    if (existingPhoto) {
      res.status(409).json({ error: "This image has already been attached." });
      return;
    }
    const [photo] = await db.insert(assetPhotosTable).values({
      id: randomUUID(),
      assetId: asset.id,
      objectPath,
      name,
      contentType,
      size,
      uploadedBy: req.user.id,
    }).returning();
    await recordActivity(asset.id, "Inspection photo attached");
    res.status(201).json(CreateAssetPhotoResponse.parse({
      id: photo.id,
      name: photo.name,
      url: `/api/storage${photo.objectPath}`,
      objectPath: photo.objectPath,
      contentType: photo.contentType,
      size: photo.size,
      createdAt: photo.createdAt.toISOString(),
    }));
  } catch (error) {
    req.log.error({ err: error }, "Could not register inspection photo");
    res.status(400).json({ error: "Uploaded image could not be registered." });
  }
});

router.get("/summary", async (_req, res): Promise<void> => {
  const summary = await getSummaryData();
  res.json(GetSummaryResponse.parse(summary));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = randomUUID();
  const [project] = await db
    .insert(projectsTable)
    .values({
      id,
      ...parsed.data,
      status: "In progress",
      date: new Date().toISOString().slice(0, 10),
      demo: false,
    })
    .returning();
  await recordActivity(id, "Inspection project created");
  res.status(201).json(CreateProjectResponse.parse(project));
});

router.patch("/assets/:id", async (req, res): Promise<void> => {
  const params = UpdateAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [asset] = await db
    .update(assetsTable)
    .set(parsed.data)
    .where(eq(assetsTable.id, params.data.id))
    .returning();
  if (!asset) {
    res.status(404).json({ error: "Finding not found" });
    return;
  }

  if (parsed.data.reviewed === true) {
    await recordActivity(asset.id, "Finding reviewed");
  } else {
    await recordActivity(asset.id, "Finding updated");
  }
  res.json(UpdateAssetResponse.parse(asset));
});

router.post("/work-orders", async (req, res): Promise<void> => {
  const parsed = CreateWorkOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [asset] = await db
    .select({ id: assetsTable.id })
    .from(assetsTable)
    .where(eq(assetsTable.id, parsed.data.assetId))
    .limit(1);
  if (!asset) {
    res.status(404).json({ error: "Finding not found" });
    return;
  }

  const id = randomUUID();
  const [workOrder] = await db
    .insert(workOrdersTable)
    .values({
      id,
      ...parsed.data,
      crew: parsed.data.crew?.trim() || "Unassigned",
      status: "Draft",
      reviewer: "Unassigned",
    })
    .returning();
  await recordActivity(id, "Draft work order created");
  res.status(201).json(CreateWorkOrderResponse.parse({
    ...workOrder,
    createdAt: workOrder.createdAt.toISOString(),
  }));
});

router.patch("/work-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateWorkOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateWorkOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const actor = req.user
    ? [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") ||
      req.user.email ||
      "Inspection lead"
    : "Inspection lead";
  const result = await transitionWorkOrder({
    id: params.data.id,
    status: parsed.data.status,
    crew: parsed.data.crew,
    actor,
  });

  if (result.kind === "not-found") {
    res.status(404).json({ error: "Work order not found." });
    return;
  }
  if (result.kind === "invalid-transition") {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(UpdateWorkOrderResponse.parse({
    ...result.workOrder,
    createdAt: result.workOrder.createdAt.toISOString(),
  }));
});

router.post("/demo", async (_req, res): Promise<void> => {
  await seedDemoData();
  const workspace = await getWorkspaceData();
  res.json(LoadDemoResponse.parse(workspace));
});

export default router;
