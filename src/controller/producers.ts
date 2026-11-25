import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { WinsRepository } from '../db/repository';
import { getProducerIntervals } from '../service/awards';
import { listProducers } from '../service/producers';

const producerQuerySchema = z.object({
  name: z.string().optional(),
  year: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(new Date().getFullYear()))
    .optional(),
  wins: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional(),
  onlyWinners: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  sort: z.literal('wins_desc').optional(),
});

export function producersController(repository: WinsRepository): RequestHandler {
  return (_req, res) => {
    res.json(getProducerIntervals(repository.allWins()));
  };
}

export function listProducersController(repository: WinsRepository): RequestHandler {
  return (req, res) => {
    const parsed = producerQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Parâmetros de consulta inválidos' });
      return;
    }
    res.json(listProducers(repository, parsed.data));
  };
}
