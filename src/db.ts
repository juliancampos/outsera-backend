import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';

export interface Win {
  producer: string;
  year: number;
}

export interface Movie {
  year: number;
  title: string;
  studios: string;
  producers: string;
  winner: boolean;
}

export interface MovieFilters {
  year?: number;
  title?: string;
  studios?: string;
  producers?: string;
  winner?: boolean;
}

export interface WinsRepository {
  allWins(): Win[];
  allMovies(filters: MovieFilters): Movie[];
  close(): void;
}

const headerSchema = z.tuple([
  z.literal('year'),
  z.literal('title'),
  z.literal('studios'),
  z.literal('producers'),
  z.literal('winner'),
]);

const rowSchema = z
  .tuple([
    z.string().trim().regex(/^\d+$/),
    z.string().trim(),
    z.string().trim(),
    z.string().trim(),
    z.string().trim(),
  ])
  .transform(([year, title, studios, producers, winner]): Movie => ({
    year: Number(year),
    title,
    studios,
    producers,
    winner: winner.toLowerCase() === 'yes',
  }));

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseCsv(content: string): { movies: Movie[]; wins: Win[] } {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('CSV vazio');
  }

  try {
    headerSchema.parse(lines[0].split(';').map((column) => column.trim()));
  } catch (error) {
    throw new Error(`cabeçalho inválido (${message(error)})`);
  }

  const movies: Movie[] = [];
  const wins: Win[] = [];
  for (const [index, line] of lines.slice(1).entries()) {
    try {
      const movie = rowSchema.parse(line.split(';'));
      movies.push(movie);
      if (!movie.winner) continue;

      const producers = new Set(
        movie.producers
          .split(/\s*(?:,|\band\b)\s*/i)
          .map((producer) => producer.trim())
          .filter((producer) => producer.length > 0),
      );
      for (const producer of producers) {
        wins.push({ producer, year: movie.year });
      }
    } catch (error) {
      throw new Error(`linha ${index + 2} inválida (${message(error)})`);
    }
  }
  return { movies, wins };
}

function toWin(row: Record<string, unknown>): Win {
  if (typeof row.producer !== 'string' || typeof row.year !== 'number') {
    throw new Error('registro inválido no banco de dados');
  }
  return { producer: row.producer, year: row.year };
}

function toMovie(row: Record<string, unknown>): Movie {
  if (
    typeof row.year !== 'number' ||
    typeof row.title !== 'string' ||
    typeof row.studios !== 'string' ||
    typeof row.producers !== 'string' ||
    (row.winner !== 0 && row.winner !== 1)
  ) {
    throw new Error('registro inválido no banco de dados');
  }
  return {
    year: row.year,
    title: row.title,
    studios: row.studios,
    producers: row.producers,
    winner: row.winner === 1,
  };
}

export async function createWinsRepository(csvPath: string): Promise<WinsRepository> {
  let content: string;
  try {
    content = await readFile(csvPath, 'utf8');
  } catch (error) {
    throw new Error(`não foi possível ler o CSV "${csvPath}": ${message(error)}`);
  }

  const { movies, wins } = parseCsv(content);
  const db = new DatabaseSync(':memory:');
  // WAL é no-op em :memory:; os pragmas ficam para espelhar o setup de produção.
  db.exec('PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL; PRAGMA journal_mode = WAL;');
  db.exec('CREATE TABLE wins (producer TEXT NOT NULL, year INTEGER NOT NULL)');
  db.exec('CREATE TABLE movies (year INTEGER, title TEXT, studios TEXT, producers TEXT, winner INTEGER)');
  const insertWin = db.prepare('INSERT INTO wins (producer, year) VALUES (?, ?)');
  const insertMovie = db.prepare(
    'INSERT INTO movies (year, title, studios, producers, winner) VALUES (?, ?, ?, ?, ?)',
  );

  try {
    db.exec('BEGIN');
    for (const movie of movies) {
      insertMovie.run(movie.year, movie.title, movie.studios, movie.producers, Number(movie.winner));
    }
    for (const win of wins) {
      insertWin.run(win.producer, win.year);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw new Error(`falha ao carregar o CSV no banco: ${message(error)}`);
  }

  const select = db.prepare('SELECT producer, year FROM wins ORDER BY producer, year');
  const selectMovies = db.prepare(`
    SELECT year, title, studios, producers, winner FROM movies
    WHERE (? IS NULL OR year = ?)
      AND (? IS NULL OR instr(lower(title), lower(?)) > 0)
      AND (? IS NULL OR instr(lower(studios), lower(?)) > 0)
      AND (? IS NULL OR instr(lower(producers), lower(?)) > 0)
      AND (? IS NULL OR winner = ?)
    ORDER BY year, title
  `);

  const allMovies = (filters: MovieFilters): Movie[] => {
    const year = filters.year ?? null;
    const title = filters.title ?? null;
    const studios = filters.studios ?? null;
    const producers = filters.producers ?? null;
    const winner = filters.winner === undefined ? null : Number(filters.winner);
    return selectMovies
      .all(year, year, title, title, studios, studios, producers, producers, winner, winner)
      .map(toMovie);
  };

  return {
    allWins: () => select.all().map(toWin),
    allMovies,
    close: () => db.close(),
  };
}
