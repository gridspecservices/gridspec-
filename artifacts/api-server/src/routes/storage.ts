import { RequestPhotoUploadUrlBody, RequestPhotoUploadUrlResponse } from "@workspace/api-zod";
import { assetPhotosTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 25 * 1024 * 1024;

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to upload inspection images." });
    return;
  }
  const parsed = RequestPhotoUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Use a JPEG, PNG, or WebP image up to 25 MB." });
    return;
  }
  const { name, size, contentType } = parsed.data;
  if (!allowedContentTypes.has(contentType) || size > maxPhotoBytes) {
    res.status(400).json({ error: "Use a JPEG, PNG, or WebP image up to 25 MB." });
    return;
  }

  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json(RequestPhotoUploadUrlResponse.parse({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    }));
  } catch (error) {
    req.log.error({ err: error }, "Could not create photo upload URL");
    res.status(500).json({ error: "Photo upload could not be started." });
  }
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to view inspection images." });
    return;
  }
  const rawPath = req.params.path;
  const objectPath = `/objects/${Array.isArray(rawPath) ? rawPath.join("/") : rawPath}`;
  const [registered] = await db.select({ id: assetPhotosTable.id })
    .from(assetPhotosTable)
    .where(eq(assetPhotosTable.objectPath, objectPath))
    .limit(1);
  if (!registered) {
    res.status(404).json({ error: "Image not found." });
    return;
  }

  try {
    const file = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Image not found." });
      return;
    }
    req.log.error({ err: error }, "Could not serve inspection image");
    res.status(500).json({ error: "Image could not be loaded." });
  }
});

export default router;
