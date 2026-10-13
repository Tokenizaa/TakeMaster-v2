import { Router } from 'express';
import authRoutes from './auth';
import showsRoutes from './shows';
import episodesRoutes from './episodes';
import productionsRoutes from './productions';
import guestsRoutes from './guests';
import scheduleRoutes from './schedule';
import libraryRoutes from './library';
import billingRoutes from './billing';
import adminRoutes from './admin';
import aiRoutes from './ai';
import knowledgeBaseRoutes from './knowledge-base';
import seedRoutes from './seed';

const router = Router();

router.use('/api/auth', authRoutes);
router.use('/api/shows', showsRoutes);
router.use('/api/episodes', episodesRoutes);
router.use('/api/productions', productionsRoutes);
router.use('/api/guests', guestsRoutes);
router.use('/api/schedule', scheduleRoutes);
router.use('/api/library', libraryRoutes);
router.use('/api/billing', billingRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/ai', aiRoutes);
router.use('/api/knowledge-base', knowledgeBaseRoutes);
router.use('/api/seed', seedRoutes);

router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;