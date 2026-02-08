import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middlewares/requireAuth";
import multer from "multer";
import { cloneVoiceAndTts } from "../services/voiceClone.service";

export const experienceRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/experience/records
experienceRoutes.post("/records", requireAuth, async (req, res) => {
  const userId = req.session.user!.id;

  const body = z
    .object({
      originalUrl: z.string().url(),
      note: z.string().optional().nullable(),
    })
    .safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid body", details: body.error.flatten() },
    });
  }

  const { originalUrl, note } = body.data;

  const { rows } = await pool.query(
    `
    INSERT INTO experience_records (user_id, original_url, note)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [userId, originalUrl, note ?? null]
  );

  res.status(201).json({ success: true, data: { recordId: rows[0].id }, error: null });
});

// POST /api/experience/voice-clone
experienceRoutes.post(
  "/voice-clone",
  requireAuth,
  upload.single("voiceFile"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: "NO_FILE", message: "voiceFile is required", details: {} },
      });
    }

    const phishingText = typeof req.body?.phishingText === "string" ? req.body.phishingText : "";
    if (!phishingText) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: "BAD_REQUEST", message: "phishingText is required", details: {} },
      });
    }

    try {
      const result = await cloneVoiceAndTts({
        audioBuffer: req.file.buffer,
        filename: req.file.originalname || "voice.webm",
        mimeType: req.file.mimetype || "audio/webm",
        text: phishingText,
      });

      return res.status(200).json({
        success: true,
        data: {
          audioBase64: result.audioBase64,
          mimeType: "audio/mpeg",
        },
        error: null,
      });
    } catch (err: any) {
      return res.status(503).json({
        success: false,
        data: null,
        error: { code: "VOICE_CLONE_FAILED", message: err?.message || "Voice clone failed", details: {} },
      });
    }
  }
);

// POST /api/experience/clones
experienceRoutes.post("/clones", requireAuth, async (req, res) => {
  const userId = req.session.user!.id;

  const body = z
    .object({
      recordId: z.number().int(),
      clonedUrl: z.string().url(),
      model: z.string().min(1),
    })
    .safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid body", details: body.error.flatten() },
    });
  }

  const rec = await pool.query(`SELECT id, user_id FROM experience_records WHERE id=$1`, [body.data.recordId]);
  if (!rec.rows[0] || rec.rows[0].user_id !== userId) {
    return res.status(403).json({
      success: false,
      data: null,
      error: { code: "FORBIDDEN", message: "Not your record", details: {} },
    });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO experience_clones (record_id, cloned_url, model)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [body.data.recordId, body.data.clonedUrl, body.data.model]
  );

  res.status(201).json({ success: true, data: { cloneId: rows[0].id }, error: null });
});

// GET /api/experience/records
experienceRoutes.get("/records", requireAuth, async (req, res) => {
  const userId = req.session.user!.id;

  const { rows } = await pool.query(
    `
    SELECT id, original_url, note, created_at
    FROM experience_records
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  res.json({ success: true, data: { items: rows }, error: null });
});
