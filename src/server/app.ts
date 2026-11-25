import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { WinsRepository } from '../db/repository';
import { createRoutes } from '../routes';
import { requestLogger, type Logger } from '../utils/logger';

export function createApp(repository: WinsRepository, logger: Logger): Express {
  const app = express();

  app.use(requestLogger(logger));

  app.use(createRoutes(repository));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: error }, 'Erro inesperado');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
