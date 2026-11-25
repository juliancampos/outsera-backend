import pino from 'pino';
import { pinoHttp, type HttpLogger } from 'pino-http';

export type Logger = pino.Logger;

interface LoggerWithDestination extends Logger {
  [pino.symbols.streamSym]: pino.DestinationStream;
}

const noMessage = (): string => undefined as unknown as string;

function requestLogObject(req: { url?: string }, value: unknown): { url: string | undefined; responseTime: string } {
  return { url: req.url, responseTime: `${(value as { responseTime: number }).responseTime} ms` };
}

export function createLogger(level: pino.LevelWithSilent, destination?: pino.DestinationStream): Logger {
  return pino(
    {
      level,
      base: undefined,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    destination,
  );
}

export function requestLogger(logger: Logger): HttpLogger {
  // Opções de formato só valem num logger raiz: child herda o cache de nível e o timestamp do pai.
  const requestLog = pino(
    {
      level: logger.level,
      base: undefined,
      timestamp: false,
      formatters: { level: () => ({}) },
      // Sem level/time/base, o pino prefixa uma vírgula; removê-la mantém o JSON válido.
      hooks: { streamWrite: (line) => (line.startsWith('{,') ? `{${line.slice(2)}` : line) },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    (logger as LoggerWithDestination)[pino.symbols.streamSym],
  );

  return pinoHttp({
    logger: requestLog,
    quietResLogger: true,
    customSuccessMessage: noMessage,
    customErrorMessage: noMessage,
    customSuccessObject: (req, _res, value) => requestLogObject(req, value),
    customErrorObject: (req, _res, _error, value) => requestLogObject(req, value),
  });
}
