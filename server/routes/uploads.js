/** File upload routes (event covers, avatars). */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
for (const dir of ['covers', 'avatars', 'misc']) {
  const p = path.join(UPLOAD_ROOT, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const kind = req.query.kind === 'avatar' ? 'avatars' : req.query.kind === 'cover' ? 'covers' : 'misc';
    cb(null, path.join(UPLOAD_ROOT, kind));
  },
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const kind = req.query.kind === 'avatar' ? 'avatars' : req.query.kind === 'cover' ? 'covers' : 'misc';
  res.status(201).json({ url: `/uploads/${kind}/${req.file.filename}` });
});

module.exports = router;
