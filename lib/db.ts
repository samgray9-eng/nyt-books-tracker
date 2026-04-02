// Talks to Turso via the HTTP Pipeline API — no native modules required.

const getBase = () => {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  // Accept libsql://, wss://, or https:// — normalize to https://
  return url.replace(/^libsql:\/\//, 'https://').replace(/^wss:\/\//, 'https://');
};

const getToken = () => {
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!token) throw new Error('TURSO_AUTH_TOKEN is not set');
  return token;
};

type SqlArg = string | number | null;

interface TursoRow { type: string; value?: string }

async function execute(sql: string, args: SqlArg[] = []): Promise<{ cols: {name:string}[]; rows: TursoRow[][] }> {
  const res = await fetch(`${getBase()}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: args.map(a => {
              if (a === null)              return { type: 'null' };
              if (typeof a === 'number')  return { type: 'integer', value: String(a) };
              return { type: 'text', value: a };
            }),
          },
        },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const first = data.results?.[0];
  if (first?.type === 'error') throw new Error(first.error?.message ?? 'Unknown Turso error');
  return first.response.result;
}

// Map raw column arrays → named objects
function toRows<T>(result: { cols: {name:string}[]; rows: TursoRow[][] }): T[] {
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj: Record<string, string | number | null> = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      if (!cell || cell.type === 'null') { obj[col] = null; return; }
      obj[col] = (cell.type === 'integer' || cell.type === 'float')
        ? Number(cell.value)
        : cell.value ?? null;
    });
    return obj as T;
  });
}

// ── Schema init ───────────────────────────────────────────────────────────────
let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await execute(`
    CREATE TABLE IF NOT EXISTS book_progress (
      book_id   INTEGER PRIMARY KEY,
      is_read   INTEGER DEFAULT 0,
      rating    INTEGER,
      read_date TEXT
    )
  `);
  schemaReady = true;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface BookProgress {
  book_id: number;
  is_read: number;
  rating: number | null;
  read_date: string | null;
}

export async function getAllProgress(): Promise<BookProgress[]> {
  await ensureSchema();
  const result = await execute('SELECT * FROM book_progress');
  return toRows<BookProgress>(result);
}

export async function upsertProgress(bookId: number, isRead: boolean, rating?: number): Promise<void> {
  await ensureSchema();
  await execute(
    `INSERT INTO book_progress (book_id, is_read, rating, read_date)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       is_read   = excluded.is_read,
       rating    = COALESCE(excluded.rating, rating),
       read_date = CASE
         WHEN excluded.is_read = 1 AND book_progress.is_read = 0
         THEN excluded.read_date
         ELSE book_progress.read_date
       END`,
    [bookId, isRead ? 1 : 0, rating ?? null, isRead ? new Date().toISOString() : null],
  );
}
