import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const createProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  country: z.string().min(2),
  currency: z.string().default("USD"),
  portfolioUrls: z.array(z.string().url()).default([]),
});

const createTierSchema = z.object({
  name: z.string().min(1).max(100),
  flexibility: z.enum(["fixed", "standard", "full_custom"]),
  price: z.number().int().positive(),
  revisionRounds: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
});

// creating your artist profile
// POST /artists/me 
router.post("/me", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.artistProfile.findUnique({
    where: { userId: req.userId },
  });
  if (existing) {
    return res.status(409).json({ error: "Artist profile already exists" });
  }

  const profile = await prisma.artistProfile.create({
    data: {
      userId: req.userId!,
      ...parsed.data,
    },
  });

  res.status(201).json(profile);
});

// POST /artists/me/pricing-tiers
router.post("/me/pricing-tiers", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createTierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const profile = await prisma.artistProfile.findUnique({
    where: { userId: req.userId },
  });
  if (!profile) {
    return res.status(404).json({ error: "Create an artist profile first" });
  }

  const tier = await prisma.pricingTier.create({
    data: {
      artistProfileId: profile.id,
      ...parsed.data,
    },
  });

  res.status(201).json(tier);
});

// view ur own artist profile
// GET /artists/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const profile = await prisma.artistProfile.findUnique({
    where: { userId: req.userId },
    include: { pricingTiers: true },
  });

  if (!profile) {
    return res.status(404).json({ error: "No artist profile found" });
  }

  res.json(profile);
});

// view other artist profile
// GET /artists/:id
router.get("/:id", async (req, res) => {
  const profile = await prisma.artistProfile.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true } },
      pricingTiers: true,
    },
  });

  if (!profile) {
    return res.status(404).json({ error: "Artist profile not found" });
  }

  res.json(profile);
});

export default router;