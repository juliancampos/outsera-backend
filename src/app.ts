import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { getProducerIntervals } from './awards';
import type { WinsRepository } from './db';
import { openapi } from './openapi';

const movieQuerySchema = z.object({
  year: z
    .string()
    .regex(/^-?\d+$/)
    .transform(Number)
    .optional(),
  title: z.string().optional(),
  studios: z.string().optional(),
  producers: z.string().optional(),
  winner: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export function createApp(repository: WinsRepository): Express {
  const app = express();

  app.get('/api/producers/intervals', (_req, res) => {
    res.json(getProducerIntervals(repository.allWins()));
  });

  app.get('/api/movies', (req, res) => {
    const parsed = movieQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Parâmetros de consulta inválidos' });
      return;
    }
    res.json(repository.allMovies(parsed.data));
  });

  app.get('/api/openapi.json', (_req, res) => {
    res.json(openapi);
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Erro inesperado:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
