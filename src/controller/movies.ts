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

const createMovieSchema = z
  .object({
    year: z.number().int().min(1).max(new Date().getFullYear()),
    title: z.string().trim().min(1),
    studios: z.string().trim().min(1),
    producers: z.string().trim().min(1),
    winner: z.literal('yes').optional().transform((value) => value === 'yes'),
  })
  .strict();

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

export function createMovieController(repository: WinsRepository): RequestHandler {
  return (req, res) => {
    const parsed = createMovieSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Corpo inválido' });
      return;
    }
    res.status(201).json(repository.createMovie(parsed.data));
  };
}
