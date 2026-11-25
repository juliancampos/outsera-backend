import type { RequestHandler } from 'express';
import type { WinsRepository } from '../db/repository';
import { getProducerIntervals } from '../service/awards';

export function producersController(repository: WinsRepository): RequestHandler {
  return (_req, res) => {
    res.json(getProducerIntervals(repository.allWins()));
  };
}
