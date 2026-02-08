import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/requireAuth";
import { uploadVoiceToS3 } from "../services/s3.service";

export const uploadsRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/uploads/voice
uploadsRoutes.post("/voice", requireAuth, upload.single("voiceFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: "NO_FILE", message: "voiceFile is required", details: {} },
    });
  }

  try {
    const result = await uploadVoiceToS3(req.file);
    return res.status(201).json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      error: null,
    });
  } catch (err: any) {
    const msg = err?.message || "S3 upload failed";
    return res.status(503).json({
      success: false,
      data: null,
      error: { code: "S3_NOT_CONFIGURED", message: msg, details: {} },
    });
  }
});
