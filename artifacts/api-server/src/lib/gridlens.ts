import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  activityTable,
  assetPhotosTable,
  assetsTable,
  db,
  projectsTable,
  workOrdersTable,
} from "@workspace/db";

const demoProjects = [
  {
    id: "demo-project-riverbend",
    name: "Riverbend East Feeder",
    utility: "Cascadia Electric",
    circuit: "RB-12",
    status: "In progress",
    date: "2026-10-15",
    demo: true,
  },
  {
    id: "demo-project-pine-valley",
    name: "Pine Valley North",
    utility: "Cascadia Electric",
    circuit: "PV-08",
    status: "Ready for review",
    date: "2026-10-13",
    demo: true,
  },
  {
    id: "demo-project-highline",
    name: "Highline 7 Recon",
    utility: "North Coast Power",
    circuit: "HL-07",
    status: "Scheduled",
    date: "2026-10-11",
    demo: true,
  },
];

const demoAssets = [
  {
    id: "demo-asset-1042",
    projectId: "demo-project-riverbend",
    structureId: "RB-1042",
    circuit: "RB-12",
    inspectionDate: "2026-10-15",
    latitude: 47.6068,
    longitude: -122.3331,
    defectType: "Crossarm deterioration",
    severity: "Critical",
    confidence: 96,
    notes: "Visible splitting at the west-side bolt hole. Recommend an urgent ground inspection before the next high-wind period.",
    utility: "Cascadia Electric",
    reviewed: false,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-1048",
    projectId: "demo-project-riverbend",
    structureId: "RB-1048",
    circuit: "RB-12",
    inspectionDate: "2026-10-15",
    latitude: 47.6094,
    longitude: -122.3282,
    defectType: "Insulator flashover",
    severity: "High",
    confidence: 91,
    notes: "Discoloration and surface tracking visible on the phase B insulator. Verify condition from the ground.",
    utility: "Cascadia Electric",
    reviewed: false,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-1056",
    projectId: "demo-project-riverbend",
    structureId: "RB-1056",
    circuit: "RB-12",
    inspectionDate: "2026-10-14",
    latitude: 47.613,
    longitude: -122.3226,
    defectType: "Vegetation encroachment",
    severity: "Medium",
    confidence: 88,
    notes: "Tree canopy is approaching the minimum clearance envelope on the north span.",
    utility: "Cascadia Electric",
    reviewed: true,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-1061",
    projectId: "demo-project-riverbend",
    structureId: "RB-1061",
    circuit: "RB-12",
    inspectionDate: "2026-10-14",
    latitude: 47.6162,
    longitude: -122.3181,
    defectType: "Conductor strand damage",
    severity: "High",
    confidence: 83,
    notes: "One outer strand appears lifted near the mid-span marker. Confirm before dispatch.",
    utility: "Cascadia Electric",
    reviewed: false,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-2203",
    projectId: "demo-project-pine-valley",
    structureId: "PV-2203",
    circuit: "PV-08",
    inspectionDate: "2026-10-13",
    latitude: 47.6212,
    longitude: -122.304,
    defectType: "Hardware corrosion",
    severity: "Medium",
    confidence: 89,
    notes: "Corrosion visible on the lower brace connection. Add to the next scheduled maintenance visit.",
    utility: "Cascadia Electric",
    reviewed: true,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-2210",
    projectId: "demo-project-pine-valley",
    structureId: "PV-2210",
    circuit: "PV-08",
    inspectionDate: "2026-10-13",
    latitude: 47.6264,
    longitude: -122.2983,
    defectType: "Crossarm deterioration",
    severity: "High",
    confidence: 94,
    notes: "Surface checking at the outer pin. Recommend a field assessment and replacement planning.",
    utility: "Cascadia Electric",
    reviewed: false,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-2222",
    projectId: "demo-project-pine-valley",
    structureId: "PV-2222",
    circuit: "PV-08",
    inspectionDate: "2026-10-12",
    latitude: 47.6311,
    longitude: -122.2918,
    defectType: "Vegetation encroachment",
    severity: "Low",
    confidence: 78,
    notes: "Monitor during the next routine patrol; current clearance is within limits.",
    utility: "Cascadia Electric",
    reviewed: true,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-7715",
    projectId: "demo-project-highline",
    structureId: "HL-7715",
    circuit: "HL-07",
    inspectionDate: "2026-10-11",
    latitude: 47.6422,
    longitude: -122.2746,
    defectType: "Guy wire slack",
    severity: "Medium",
    confidence: 86,
    notes: "Guy wire tension appears low near the anchor. Check tension and anchor condition.",
    utility: "North Coast Power",
    reviewed: false,
    demo: true,
    photos: [],
  },
  {
    id: "demo-asset-7724",
    projectId: "demo-project-highline",
    structureId: "HL-7724",
    circuit: "HL-07",
    inspectionDate: "2026-10-11",
    latitude: 47.6477,
    longitude: -122.2679,
    defectType: "Insulator flashover",
    severity: "Critical",
    confidence: 97,
    notes: "Arc marking on the upper insulator skirt. Prioritize close ground inspection.",
    utility: "North Coast Power",
    reviewed: false,
    demo: true,
    photos: [],
  },
];

const demoWorkOrders = [
  {
    id: "demo-order-501",
    assetId: "demo-asset-1042",
    issue: "Ground inspection of split crossarm at structure RB-1042. Confirm condition and advise on immediate replacement.",
    priority: "Critical",
    crew: "North Field Crew",
    status: "Draft",
    reviewer: "Unassigned",
  },
  {
    id: "demo-order-502",
    assetId: "demo-asset-2203",
    issue: "Inspect brace connection and assess corrosion treatment during the next maintenance visit.",
    priority: "Medium",
    crew: "Pine Valley Crew",
    status: "Needs Review",
    reviewer: "M. Chen",
  },
];

function demoActivityRows() {
  return [
    {
      id: "demo-activity-1",
      time: new Date("2026-10-17T15:45:00.000Z"),
      entityId: "demo-asset-1042",
      action: "Critical finding flagged",
      actor: "Aerial review",
    },
    {
      id: "demo-activity-2",
      time: new Date("2026-10-17T14:20:00.000Z"),
      entityId: "demo-asset-2203",
      action: "Finding reviewed",
      actor: "M. Chen",
    },
    {
      id: "demo-activity-3",
      time: new Date("2026-10-17T12:05:00.000Z"),
      entityId: "demo-order-501",
      action: "Draft work order created",
      actor: "J. Alvarez",
    },
    {
      id: "demo-activity-4",
      time: new Date("2026-10-16T18:30:00.000Z"),
      entityId: "demo-project-pine-valley",
      action: "Inspection data received",
      actor: "Flight operations",
    },
  ];
}

export async function seedDemoData(): Promise<void> {
  const existing = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, "demo-project-riverbend"))
    .limit(1);
  if (existing.length > 0) return;

  await db.transaction(async (tx) => {
    await tx.insert(projectsTable).values(demoProjects).onConflictDoNothing();
    await tx.insert(assetsTable).values(demoAssets).onConflictDoNothing();
    await tx.insert(workOrdersTable).values(demoWorkOrders).onConflictDoNothing();
    await tx.insert(activityTable).values(demoActivityRows()).onConflictDoNothing();
  });
}

export async function getWorkspaceData(includePrivatePhotos = false) {
  const [projects, assets, workOrders, audit, uploadedPhotos] = await Promise.all([
    db.select().from(projectsTable).orderBy(desc(projectsTable.date)),
    db.select().from(assetsTable).orderBy(desc(assetsTable.inspectionDate)),
    db.select().from(workOrdersTable).orderBy(desc(workOrdersTable.createdAt)),
    db.select().from(activityTable).orderBy(desc(activityTable.time)).limit(12),
    includePrivatePhotos ? db.select().from(assetPhotosTable) : Promise.resolve([]),
  ]);

  return {
    projects,
    assets: assets.map((asset) => ({
      ...asset,
      photos: [
        ...asset.photos,
        ...uploadedPhotos
          .filter((photo) => photo.assetId === asset.id)
          .map((photo) => ({
            id: photo.id,
            name: photo.name,
            url: `/api/storage${photo.objectPath}`,
            objectPath: photo.objectPath,
            contentType: photo.contentType,
            size: photo.size,
            createdAt: photo.createdAt.toISOString(),
          })),
      ],
    })),
    workOrders: workOrders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
    audit: audit.map((event) => ({
      ...event,
      time: event.time.toISOString(),
    })),
  };
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export async function getSummaryData() {
  const [projects, assets, workOrders] = await Promise.all([
    db.select({ id: projectsTable.id }).from(projectsTable),
    db
      .select({
        severity: assetsTable.severity,
        defectType: assetsTable.defectType,
        circuit: assetsTable.circuit,
        reviewed: assetsTable.reviewed,
        inspectionDate: assetsTable.inspectionDate,
      })
      .from(assetsTable),
    db.select({ status: workOrdersTable.status }).from(workOrdersTable),
  ]);

  const monthCounts = new Map<string, number>();
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    monthCounts.set(month.toISOString().slice(0, 7), 0);
  }
  for (const asset of assets) {
    const month = asset.inspectionDate.slice(0, 7);
    if (monthCounts.has(month)) monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  return {
    totalAssets: assets.length,
    totalProjects: projects.length,
    criticalFindings: assets.filter((asset) => asset.severity === "Critical").length,
    openWorkOrders: workOrders.filter((order) => order.status !== "Completed").length,
    reviewed: assets.filter((asset) => asset.reviewed).length,
    byType: countBy(assets.map((asset) => asset.defectType)),
    bySeverity: ["Critical", "High", "Medium", "Low"].map((name) => ({
      name,
      count: assets.filter((asset) => asset.severity === name).length,
    })),
    byCircuit: countBy(assets.map((asset) => asset.circuit)),
    trend: Array.from(monthCounts, ([name, count]) => ({ name, count })),
  };
}

export async function recordActivity(
  entityId: string,
  action: string,
  actor = "Inspection lead",
): Promise<void> {
  await db.insert(activityTable).values({
    id: randomUUID(),
    entityId,
    action,
    actor,
  });
}

