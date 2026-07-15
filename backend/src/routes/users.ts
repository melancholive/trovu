import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';

const router = Router();

// POST /users
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'thee email, password, and name is required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'THIS user with that email already existss' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role === 'artist' ? 'artist' : 'buyer',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating the user:', err);
    res.status(500).json({ error: 'Something went wrong with creting user' });
  }
});

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