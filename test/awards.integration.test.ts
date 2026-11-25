import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import test from 'node:test';
import { createApp } from '../src/server/app';
import { createWinsRepository, type Movie, type WinsRepository } from '../src/db/repository';
import type { Intervals, ProducerInterval } from '../src/service/awards';
import { createLogger } from '../src/utils/logger';

const root = path.resolve(__dirname, '..', '..');

const fixture = [
  'year;title;studios;producers;winner',
  '2000;A;Studio;P1, Solo;yes',
  '2001;B;Studio;P1 and Solo 2;yes',
  '2020;C;Studio;P1;yes',
  '2005;D;Studio;P2;yes',
  '2006;E;Studio;P2;yes',
  '2025;F;Studio;P2;yes',
  '2010;G;Studio;P3, and Extra;YES',
  '2010;H;Studio;P3;yes',
  '2015;I;Studio;P3;yes',
  '1950;J;Studio;P4;yes',
  '1969;K;Studio;P4;yes',
  '1990;L;Studio;Lonely;yes',
  '1999;M;Different Studio;P1;no',
  '2002;N;Another Studio;P1;',
  '',
  '',
].join('\r\n');

const allMovies: Movie[] = [
  { year: 1950, title: 'J', studios: 'Studio', producers: 'P4', winner: true },
  { year: 1969, title: 'K', studios: 'Studio', producers: 'P4', winner: true },
  { year: 1990, title: 'L', studios: 'Studio', producers: 'Lonely', winner: true },
  { year: 1999, title: 'M', studios: 'Different Studio', producers: 'P1', winner: false },
  { year: 2000, title: 'A', studios: 'Studio', producers: 'P1, Solo', winner: true },
  { year: 2001, title: 'B', studios: 'Studio', producers: 'P1 and Solo 2', winner: true },
  { year: 2002, title: 'N', studios: 'Another Studio', producers: 'P1', winner: false },
  { year: 2005, title: 'D', studios: 'Studio', producers: 'P2', winner: true },
  { year: 2006, title: 'E', studios: 'Studio', producers: 'P2', winner: true },
  { year: 2010, title: 'G', studios: 'Studio', producers: 'P3, and Extra', winner: true },
  { year: 2010, title: 'H', studios: 'Studio', producers: 'P3', winner: true },
  { year: 2015, title: 'I', studios: 'Studio', producers: 'P3', winner: true },
  { year: 2020, title: 'C', studios: 'Studio', producers: 'P1', winner: true },
  { year: 2025, title: 'F', studios: 'Studio', producers: 'P2', winner: true },
];

const onlySingleWins = [
  'year;title;studios;producers;winner',
  '2001;A;Studio;Solo;yes',
  '2002;B;Studio;Another, One;yes',
].join('\n');

function sortIntervals(items: ProducerInterval[]): ProducerInterval[] {
  return [...items].sort((a, b) => a.producer.localeCompare(b.producer) || a.previousWin - b.previousWin);
}

async function withApi(
  csvPath: string,
  run: (baseUrl: string) => Promise<void>,
  logger = createLogger('silent'),
): Promise<void> {
  const repository: WinsRepository = await createWinsRepository(csvPath);
  const server: Server = createApp(repository, logger).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    repository.close();
  }
}

async function get(pathname: string, baseUrl: string): Promise<{ status: number; contentType: string | null; body: unknown }> {
  const response = await fetch(`${baseUrl}${pathname}`);
  const body: unknown = await response.json();
  return { status: response.status, contentType: response.headers.get('content-type'), body };
}

interface SpecPath {
  get: {
    parameters: Array<{ name: string; required: boolean; schema: { type: string } }>;
    responses: Record<string, unknown>;
  };
}

interface SpecResponse {
  openapi: string;
  paths: Record<string, SpecPath>;
}

async function withAlternativeApi(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'outsera-api-'));
  const csvPath = path.join(dir, 'movies.csv');

  try {
    await writeFile(csvPath, `\uFEFF${fixture}`, 'utf8');
    await withApi(csvPath, run);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('CSV alternativo: empates, deduplicação, múltiplos produtores e produtor com uma vitória', async () => {
  await withAlternativeApi(async (baseUrl) => {
    const result = await get('/api/producers/intervals', baseUrl);
    assert.equal(result.status, 200);
    assert.match(result.contentType ?? '', /application\/json/);

    const body = result.body as Intervals;
    assert.deepEqual(sortIntervals(body.min), [
      { producer: 'P1', interval: 1, previousWin: 2000, followingWin: 2001 },
      { producer: 'P2', interval: 1, previousWin: 2005, followingWin: 2006 },
    ]);
    assert.deepEqual(sortIntervals(body.max), [
      { producer: 'P1', interval: 19, previousWin: 2001, followingWin: 2020 },
      { producer: 'P2', interval: 19, previousWin: 2006, followingWin: 2025 },
      { producer: 'P4', interval: 19, previousWin: 1950, followingWin: 1969 },
    ]);
  });
});

test('CSV de referência: intervalos esperados', async () => {
  await withApi(path.join(root, 'docs', 'Movielist.csv'), async (baseUrl) => {
    const result = await get('/api/producers/intervals', baseUrl);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      min: [{ producer: 'Joel Silver', interval: 1, previousWin: 1990, followingWin: 1991 }],
      max: [{ producer: 'Matthew Vaughn', interval: 13, previousWin: 2002, followingWin: 2015 }],
    });
  });
});

test('sem intervalos e rota desconhecida', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'outsera-api-'));
  const csvPath = path.join(dir, 'movies.csv');

  try {
    await writeFile(csvPath, onlySingleWins, 'utf8');
    await withApi(csvPath, async (baseUrl) => {
      const intervals = await get('/api/producers/intervals', baseUrl);
      assert.equal(intervals.status, 200);
      assert.deepEqual(intervals.body, { min: [], max: [] });

      const notFound = await get('/api/desconhecida', baseUrl);
      assert.equal(notFound.status, 404);
      assert.match(notFound.contentType ?? '', /application\/json/);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('GET /api/movies sem filtros: todas as linhas, ordenadas, com vencedores e não vencedores', async () => {
  await withAlternativeApi(async (baseUrl) => {
    const result = await get('/api/movies', baseUrl);
    assert.equal(result.status, 200);
    assert.match(result.contentType ?? '', /application\/json/);
    assert.deepEqual(result.body, allMovies);
  });
});

test('GET /api/movies: filtros isolados, combinados e literais', async () => {
  await withAlternativeApi(async (baseUrl) => {
    const cases: Array<[string, Movie[]]> = [
      ['/api/movies?year=2000', allMovies.filter((movie) => movie.year === 2000)],
      ['/api/movies?title=b', allMovies.filter((movie) => movie.title.toLowerCase().includes('b'))],
      [
        '/api/movies?studios=different',
        allMovies.filter((movie) => movie.studios.toLowerCase().includes('different')),
      ],
      [
        '/api/movies?producers=solo',
        allMovies.filter((movie) => movie.producers.toLowerCase().includes('solo')),
      ],
      ['/api/movies?winner=true', allMovies.filter((movie) => movie.winner)],
      ['/api/movies?winner=false', allMovies.filter((movie) => !movie.winner)],
      [
        '/api/movies?year=2000&title=a&studios=STUDIO&producers=solo&winner=true',
        allMovies.filter((movie) => movie.year === 2000),
      ],
      ['/api/movies?title=%25&producers=_', []],
      ['/api/movies?year=2000&foo=bar', allMovies.filter((movie) => movie.year === 2000)],
    ];

    for (const [pathname, expected] of cases) {
      const result = await get(pathname, baseUrl);
      assert.equal(result.status, 200, pathname);
      assert.deepEqual(result.body, expected, pathname);
    }
  });
});

test('GET /api/movies com parâmetros inválidos: 400 em JSON', async () => {
  await withAlternativeApi(async (baseUrl) => {
    const pathnames = [
      '/api/movies?year=abc',
      '/api/movies?winner=maybe',
      '/api/movies?winner=True',
      '/api/movies?year=2000&year=2001',
    ];

    for (const pathname of pathnames) {
      const result = await get(pathname, baseUrl);
      assert.equal(result.status, 400, pathname);
      assert.match(result.contentType ?? '', /application\/json/);
      assert.deepEqual(result.body, { error: 'Parâmetros de consulta inválidos' }, pathname);
    }
  });
});

test('documentação Swagger: UI em /api-docs/ e spec em /api/openapi.json', async () => {
  await withAlternativeApi(async (baseUrl) => {
    const docs = await fetch(`${baseUrl}/api-docs/`);
    assert.equal(docs.status, 200);
    assert.match(docs.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await docs.text(), /Swagger UI/);

    const result = await get('/api/openapi.json', baseUrl);
    assert.equal(result.status, 200);
    assert.match(result.contentType ?? '', /application\/json/);

    const spec = result.body as SpecResponse;
    assert.equal(spec.openapi, '3.0.3');
    assert.deepEqual(Object.keys(spec.paths).sort(), ['/api/movies', '/api/producers/intervals']);
    assert.deepEqual(Object.keys(spec.paths['/api/producers/intervals'].get.responses).sort(), ['200', '500']);
    assert.deepEqual(Object.keys(spec.paths['/api/movies'].get.responses).sort(), ['200', '400', '500']);
    assert.deepEqual(
      spec.paths['/api/movies'].get.parameters.map((parameter) => ({
        name: parameter.name,
        type: parameter.schema.type,
        required: parameter.required,
      })),
      [
        { name: 'year', type: 'integer', required: false },
        { name: 'title', type: 'string', required: false },
        { name: 'studios', type: 'string', required: false },
        { name: 'producers', type: 'string', required: false },
        { name: 'winner', type: 'boolean', required: false },
      ],
    );
  });
});

test('log estruturado: apenas url e responseTime em uma linha JSON', async () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const line = String(chunk);
      lines.push(line);
      stream.emit('entry', line);
      callback();
    },
  });

  await withApi(path.join(root, 'docs', 'Movielist.csv'), async (baseUrl) => {
    const logged = once(stream, 'entry');
    const response = await fetch(`${baseUrl}/api/producers/intervals`, {
      headers: { authorization: 'Bearer secreto', cookie: 'sessao=secreta' },
    });
    await logged;
    await response.json();

    assert.equal(lines.length, 1);
    const entry: unknown = JSON.parse(lines[0] ?? '{}');
    assert.ok(entry && typeof entry === 'object');
    const log = entry as Record<string, unknown>;
    assert.deepEqual(Object.keys(log).sort(), ['responseTime', 'url']);
    assert.equal(log.url, '/api/producers/intervals');
    assert.equal(typeof log.responseTime, 'string');
    const responseTime = log.responseTime as string;
    assert.match(responseTime, /^\d+ ms$/);
    const ms = Number.parseInt(responseTime, 10);
    assert.ok(Number.isFinite(ms));
    assert.ok(ms >= 0);
    for (const key of ['msg', 'req', 'res', 'level', 'time', 'pid', 'hostname']) {
      assert.equal(key in log, false, key);
    }
    assert.doesNotMatch(lines[0] ?? '', /Bearer secreto|sessao=secreta/);
  }, createLogger('info', stream));
});
