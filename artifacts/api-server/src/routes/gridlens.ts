import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
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
} from "@workspace/api-zod";
import {
  assetsTable,
  db,
  projectsTable,
  workOrdersTable,
} from "@workspace/db";
import {
  getSummaryData,
  getWorkspaceData,
  recordActivity,
  seedDemoData,
} from "../lib/gridlens";

const router: IRouter = Router();

router.get("/workspace", async (req, res): Promise<void> => {
  req.log.info("Fetching GridLens workspace");
  const workspace = await getWorkspaceData();
  res.json(GetWorkspaceResponse.parse(workspace));
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

router.post("/demo", async (_req, res): Promise<void> => {
  await seedDemoData();
  const workspace = await getWorkspaceData();
  res.json(LoadDemoResponse.parse(workspace));
});

export default router;
