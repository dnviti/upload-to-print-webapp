import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Helper to find user
const findUser = (username) => db.data.users.find(u => u.username === username);

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Auto-seed admin if no users exist
    if (db.data.users.length === 0 && username === 'admin' && password === 'admin') {
         const hashedPassword = await bcrypt.hash('admin', 10);
         const admin = { id: nanoid(), username: 'admin', password: hashedPassword };
         db.data.users.push(admin);
         await db.write();
         console.log('Seeded default admin user');
    }

    const user = findUser(username);
    if (!user) return res.status(400).json({ error: 'Invalid username or password.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid username or password.' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

export default router;
