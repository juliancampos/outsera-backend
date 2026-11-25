import express, { type Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { moviesController } from '../controller/movies';
import { producersController } from '../controller/producers';
import type { WinsRepository } from '../db/repository';
import { openapi } from './openapi';

export function createRoutes(repository: WinsRepository): Router {
  const router = express.Router();

  router.get('/api/producers/intervals', producersController(repository));
  router.get('/api/movies', moviesController(repository));
  router.get('/api/openapi.json', (_req, res) => {
    res.json(openapi);
  });
  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

  return router;
}
