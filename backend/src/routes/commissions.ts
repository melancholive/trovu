import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const createCommissionSchema = z.object({
  pricingTierId: z.string().uuid(),
  brief: z.string().min(1).max(2000),
  referenceUrls: z.array(z.string().url()).default([]),
});

// the buyer starts comm process
// POST /commissions
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createCommissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const tier = await prisma.pricingTier.findUnique({
    where: { id: parsed.data.pricingTierId },
    include: { artistProfile: true },
  });

  if (!tier) {
    return res.status(404).json({ error: "Pricing tier not found" });
  }

  if (!tier.artistProfile.acceptingCommissions) {
    return res.status(400).json({ error: "Artist is not accepting commissions right now" });
  }

  if (tier.artistProfile.userId === req.userId) {
    return res.status(400).json({ error: "You cannot commission your own tier" });
  }

  const commission = await prisma.commission.create({
    data: {
      buyerId: req.userId!,
      artistProfileId: tier.artistProfileId,
      pricingTierId: tier.id,
      brief: parsed.data.brief,
      referenceUrls: parsed.data.referenceUrls,
      agreedPrice: tier.price,
      revisionRounds: tier.revisionRounds,
    },
  });

  res.status(201).json(commission);
});

// view single comm
// GET /commissions/:id 
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const commission = await prisma.commission.findUnique({
    where: { id },
    include: {
      pricingTier: true,
      artistProfile: true,
      milestones: true,
    },
  });

  if (!commission) {
    return res.status(404).json({ error: "Commission not found" });
  }

  const isBuyer = commission.buyerId === req.userId;
  const isArtist = commission.artistProfile.userId === req.userId;

  if (!isBuyer && !isArtist) {
    return res.status(403).json({ error: "Not authorized to view this commission" });
  }

  res.json(commission);
});

// artist accept
// POST /commissions/:id/accept 
router.post("/:id/accept", requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const commission = await prisma.commission.findUnique({
    where: { id },
    include: { artistProfile: true },
  });

  if (!commission) {
    return res.status(404).json({ error: "Commission not found" });
  }
  if (commission.artistProfile.userId !== req.userId) {
    return res.status(403).json({ error: "Only the artist can accept this commission" });
  }
  if (commission.status !== "pending") {
    return res.status(400).json({ error: `Cannot accept a commission with status "${commission.status}"` });
  }

  const updated = await prisma.commission.update({
    where: { id: commission.id },
    data: { status: "accepted" },
  });

  res.json(updated);
});

// artist declines
// POST /commissions/:id/decline — artist declines
router.post("/:id/decline", requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const commission = await prisma.commission.findUnique({
    where: { id },
    include: { artistProfile: true },
  });

  if (!commission) {
    return res.status(404).json({ error: "Commission not found" });
  }
  if (commission.artistProfile.userId !== req.userId) {
    return res.status(403).json({ error: "Only the artist can decline this commission" });
  }
  if (commission.status !== "pending") {
    return res.status(400).json({ error: `Cannot decline a commission with status "${commission.status}"` });
  }

  const updated = await prisma.commission.update({
    where: { id: commission.id },
    data: { status: "declined" },
  });

  res.json(updated);
});

export default router;