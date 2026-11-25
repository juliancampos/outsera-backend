import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { WinsRepository } from '../db/repository';

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

export function moviesController(repository: WinsRepository): RequestHandler {
  return (req, res) => {
    const parsed = movieQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Parâmetros de consulta inválidos' });
      return;
    }
    res.json(repository.allMovies(parsed.data));
  };
}
