import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const router = express.Router();

// Helper
const getShares = () => db.data.shares;

// ADMIN: Create Share
router.post('/', auth, async (req, res) => {
    const { name, password, expiresAt } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Name and password required.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newShare = {
        id: nanoid(10), // Short ID for URL
        name,
        password: hashedPassword,
        expiresAt: expiresAt || null,
        createdAt: new Date().toISOString()
    };

    db.data.shares.push(newShare);
    await db.write();
    
    // Return share without password
    const { password: _, ...shareData } = newShare;
    res.json(shareData);
});

// ADMIN: List Shares
router.get('/', auth, (req, res) => {
    const shares = db.data.shares.map(({ password, ...s }) => s);
    res.json(shares);
});

// ADMIN: Get Share Details (including files)
router.get('/:id/admin', auth, (req, res) => {
    const share = db.data.shares.find(s => s.id === req.params.id);
    if (!share) return res.status(404).json({ error: 'Share not found' });

    const files = db.data.files.filter(f => f.shareId === share.id);
    const { password, ...shareData } = share;
    res.json({ ...shareData, files });
});

// PUBLIC: Verify Share Password
router.post('/verify', async (req, res) => {
    const { shareId, password } = req.body;
    const share = db.data.shares.find(s => s.id === shareId);

    if (!share) return res.status(404).json({ error: 'Share not found' });

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'Share expired' });
    }

    const validPassword = await bcrypt.compare(password, share.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

    // Generate Share Token
    const token = jwt.sign({ shareId: share.id, type: 'share' }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, shareName: share.name });
});

// ADMIN: Delete Share
router.delete('/:id', auth, async (req, res) => {
    const shareIndex = db.data.shares.findIndex(s => s.id === req.params.id);
    if (shareIndex === -1) return res.status(404).json({ error: 'Share not found' });

    // 1. Find all files for this share
    const shareFiles = db.data.files.filter(f => f.shareId === req.params.id);

    // 2. Delete files from disk
    shareFiles.forEach(file => {
        const filePath = join(__dirname, '../uploads', file.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });

    // 3. Remove files from DB
    db.data.files = db.data.files.filter(f => f.shareId !== req.params.id);

    // 4. Remove share from DB
    db.data.shares.splice(shareIndex, 1);
    await db.write();

    res.json({ message: 'Share and associated files deleted' });
});

export default router;
