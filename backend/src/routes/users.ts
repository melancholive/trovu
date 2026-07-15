import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: {id: req.userId},
    select: {id: true, email:true, name: true, role: true, createdAt: true},
  })

  if(!user){
    return res.status(404).json({error: "User not found"});
  }

  res.json(user);
})

// GET /users/:id 
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error with fetching user:', err);
    res.status(500).json({ error: 'Something went wrong fetching the user' });
  }
});

export default router;