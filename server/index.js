import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Routes
import authRoutes from './routes/auth.js';
import shareRoutes from './routes/shares.js';
import fileRoutes from './routes/files.js';

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/files', fileRoutes);

// Ensure uploads directory exists
const uploadDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Basic Route
app.use(express.static(join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
