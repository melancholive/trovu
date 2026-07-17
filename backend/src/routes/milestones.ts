import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const STAGES = ["sketch", "lineart", "color", "final"] as const;

const submitMilestoneSchema = z.object({
  stage: z.enum(STAGES),
  imageUrl: z.string().url(),
});

// artist submitting their work for stage
// POST /commissions/:id/milestones 
router.post("/:id/milestones", requireAuth, async (req: AuthRequest, res) => {
  const parsed = submitMilestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const commissionId = req.params.id as string;

  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    include: { artistProfile: true },
  });

  if (!commission) {
    return res.status(404).json({ error: "Commission not found" });
  }
  if (commission.artistProfile.userId !== req.userId) {
    return res.status(403).json({ error: "Only the artist can submit work" });
  }
  if (commission.status !== "accepted" && commission.status !== "in_progress") {
    return res.status(400).json({ error: `Cannot submit work for a commission with status "${commission.status}"` });
  }

  const milestone = await prisma.milestone.create({
    data: {
      commissionId: commission.id,
      stage: parsed.data.stage,
      imageUrl: parsed.data.imageUrl,
      status: "submitted",
    },
  });

  // moves to in progress for first commission
  if (commission.status === "accepted") {
    await prisma.commission.update({
      where: { id: commission.id },
      data: { status: "in_progress" },
    });
  }

  res.status(201).json(milestone);
});

// the buyer approves the stage
// POST /commissions/:id/milestones/:milestoneId/approve 
router.post("/:id/milestones/:milestoneId/approve", requireAuth, async (req: AuthRequest, res) => {
  const commissionId = req.params.id as string;
  const milestoneId = req.params.milestoneId as string;

  const commission = await prisma.commission.findUnique({ where: { id: commissionId } });
  if (!commission) {
    return res.status(404).json({ error: "Commission not found" });
  }
  if (commission.buyerId !== req.userId) {
    return res.status(403).json({ error: "Only the buyer can approve work" });
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone || milestone.commissionId !== commission.id) {
    return res.status(404).json({ error: "Milestone not found" });
  }
  if (milestone.status !== "submitted") {
    return res.status(400).json({ error: `Cannot approve a milestone with status "${milestone.status}"` });
  }

  const updated = await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: "approved" },
  });

  // if final, mark completew
  if (milestone.stage === "final") {
    await prisma.commission.update({
      where: { id: commission.id },
      data: { status: "completed" },
    });
  }

  res.json(updated);
});

// if buyer request change
// POST /commissions/:id/milestones/:milestoneId/request-revision
const revisionSchema = z.object({
  feedback: z.string().min(1).max(1000),
});

router.post("/:id/milestones/:milestoneId/request-revision", requireAuth, async (req: AuthRequest, res) => {
  const parsed = revisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const commissionId = req.params.id as string;
  const milestoneId = req.params.milestoneId as string;

  const commission = await prisma.commission.findUnique({ where: { id: commissionId } });
  if (!commission) {
    return res.status(404).json({ error: "Commission not found" });
  }
  if (commission.buyerId !== req.userId) {
    return res.status(403).json({ error: "Only the buyer can request revisions" });
  }
  if (commission.revisionsUsed >= commission.revisionRounds) {
    return res.status(400).json({ error: "No revision rounds remaining" });
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone || milestone.commissionId !== commission.id) {
    return res.status(404).json({ error: "Milestone not found" });
  }
  if (milestone.status !== "submitted") {
    return res.status(400).json({ error: `Cannot request revision on a milestone with status "${milestone.status}"` });
  }

  const updatedMilestone = await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: "revision_requested", feedback: parsed.data.feedback },
  });

  await prisma.commission.update({
    where: { id: commission.id },
    data: { revisionsUsed: { increment: 1 } },
  });

  res.json(updatedMilestone);
});

export default router;