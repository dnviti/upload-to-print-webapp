import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = nanoid() + extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});

const fileFilter = (req, file, cb) => {
    // Enable image types only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

// Middleware for Share Token
const shareAuth = (req, res, next) => {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    // Allow token via query param for image previews
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'share') throw new Error();
        req.shareId = decoded.shareId;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid share token' });
    }
};

// PUBLIC: Upload File
router.post('/upload', shareAuth, upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const newFiles = req.files.map(f => ({
        id: nanoid(),
        shareId: req.shareId,
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        createdAt: new Date().toISOString()
    }));

    db.data.files.push(...newFiles);
    await db.write();

    res.json({ message: 'Upload successful', files: newFiles });
});

// PUBLIC: List Files in Share
router.get('/', shareAuth, (req, res) => {
    const files = db.data.files.filter(f => f.shareId === req.shareId);
    res.json(files);
});

// PUBLIC: Preview File (Image)
router.get('/:id/preview', shareAuth, (req, res) => {
    const file = db.data.files.find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    // Ensure it belongs to the authenticated share
    if (file.shareId !== req.shareId) return res.status(403).json({ error: 'Access denied' });

    const filePath = join(__dirname, '../uploads', file.filename);
    res.sendFile(filePath);
});

// ADMIN: Download File
router.get('/:id/download', auth, (req, res) => {
    const file = db.data.files.find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const filePath = join(__dirname, '../uploads', file.filename);
    res.download(filePath, file.originalName);
});

// SHARED/ADMIN: Delete File
router.delete('/:id', async (req, res) => {
    let user = null;
    let shareId = null;

    // Check auth type
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type === 'share') {
             shareId = decoded.shareId;
        } else if (decoded.id) {
             user = decoded; // Admin
        }
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const fileIndex = db.data.files.findIndex(f => f.id === req.params.id);
    if (fileIndex === -1) return res.status(404).json({ error: 'File not found' });
    const file = db.data.files[fileIndex];

    // Permission Check
    if (shareId && file.shareId !== shareId) {
        return res.status(403).json({ error: 'Access denied' });
    }
    // Admin can delete any file

    // Delete from FS
    const filePath = join(__dirname, '../uploads', file.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // Delete from DB
    db.data.files.splice(fileIndex, 1);
    await db.write();

    res.json({ message: 'File deleted' });
});

export default router;
