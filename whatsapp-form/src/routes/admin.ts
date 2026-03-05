import { Router } from 'express';
import { Session } from '../models/Session';
import { existsSync, rmSync } from 'fs';

console.log('Loaded admin router');
const router = Router();

// POST /api/admin/reset-sessions?key=...  (reset WhatsApp sessions)
router.post('/admin/reset-sessions', async (req, res) => {
  const supplied = req.query.key || req.headers['x-reset-key'];
  const resetKey = process.env.RESET_KEY;
  if (!resetKey || supplied !== resetKey) {
    return res.status(403).json({ error: 'Invalid or missing reset key' });
  }
  let dbResult = null, fileDeleted = false, fileError = null;
  try {
    dbResult = await Session.deleteMany({});
  } catch (err) {
    return res.status(500).json({ error: 'DB session removal failed', details: String(err) });
  }
  try {
    const sessionFolder = '.wwebjs-auth';
    if (existsSync(sessionFolder)) {
      rmSync(sessionFolder, { recursive: true, force: true });
      fileDeleted = true;
    }
  } catch (err) {
    fileError = String(err);
  }
  res.json({ ok: true, db: dbResult, fileDeleted, fileError });
});

router.all('/admin/test', (req, res) => { res.json({ ok: true, method: req.method }); });

export default router;
