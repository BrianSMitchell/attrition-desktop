import { Router } from 'express';
import gameRouter from '../game/tech';

const router: Router = Router();

// Add deprecation notice middleware
router.use((req, res, next) => {
  res.setHeader('X-Deprecated-Path', 'This path is deprecated. Use /api/game/tech/* instead.');
  res.setHeader('X-New-Path', req.path.replace('/tech', '/game/tech'));
  next();
});

// Mount all game routes - the tech routes will match from /api/tech/tech/*
// while other game routes will 404 (since /api/tech/game/* won't match in game router)
router.use('/', gameRouter);

export default router;