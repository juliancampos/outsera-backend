import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { WinsRepository } from '../db/repository';
import { createRoutes } from '../routes';
import { requestLogger, type Logger } from '../utils/logger';

function isInvalidJsonBody(error: unknown): error is SyntaxError & { status: number } {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status === 400
  );
}

export function createApp(repository: WinsRepository, logger: Logger): Express {
  const app = express();

  app.use(requestLogger(logger));

  app.use(express.json());

  app.use(createRoutes(repository));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isInvalidJsonBody(error)) {
      res.status(400).json({ error: 'Corpo JSON inválido' });
      return;
    }
    logger.error({ err: error }, 'Erro inesperado');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
