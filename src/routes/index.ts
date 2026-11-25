import express, { type Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { createMovieController, moviesController } from '../controller/movies';
import { listProducersController, producersController } from '../controller/producers';
import type { WinsRepository } from '../db/repository';
import { openapi } from './openapi';

export function createRoutes(repository: WinsRepository): Router {
  const router = express.Router();

  router.get('/api/producers', listProducersController(repository));
  router.get('/api/producers/intervals', producersController(repository));
  router.get('/api/movies', moviesController(repository));
  router.post('/api/movies', createMovieController(repository));
  router.get('/api/openapi.json', (_req, res) => {
    res.json(openapi);
  });
  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

  return router;
}
