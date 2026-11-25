import { z } from 'zod';
import { createApp } from './app';
import { createWinsRepository } from './db';
import { createLogger } from './utils/logger';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CSV_PATH: z.string().min(1).default('docs/Movielist.csv'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const logger = createLogger(env.LOG_LEVEL);
  const repository = await createWinsRepository(env.CSV_PATH);
  const server = createApp(repository, logger).listen(env.PORT, '0.0.0.0', () => {
    logger.info(`API ouvindo em 0.0.0.0:${env.PORT} (CSV: ${env.CSV_PATH})`);
  });

  server.on('error', (error: Error) => {
    logger.error({ err: error }, 'Falha ao iniciar o servidor');
    process.exitCode = 1;
  });
}

main().catch((error: unknown) => {
  console.error('Falha na inicialização:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
