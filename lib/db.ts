// Talks to Turso via the HTTP Pipeline API — no native modules required.

const getBase = () => {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  return url.replace(/^libsql:\/\//, 'https://').replace(/^wss:\/\//, 'https://');
};

const getToken = () => {
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!token) throw new Error('TURSO_AUTH_TOKEN is not set');
  return token;
};

type SqlArg = string | number | null;
interface TursoCell { type: string; value?: string }

async function execute(sql: string, args: SqlArg[] = []): Promise<{ cols: { name: string }[]; rows: TursoCell[][] }> {
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
              if (a === null)             return { type: 'null' };
              if (typeof a === 'number') return { type: 'integer', value: String(a) };
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

function toRows<T>(result: { cols: { name: string }[]; rows: TursoCell[][] }): T[] {
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj: Record<string, string | number | null> = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      if (!cell || cell.type === 'null') { obj[col] = null; return; }
      obj[col] = (cell.type === 'integer' || cell.type === 'float')
        ? Number(cell.value)
        : (cell.value ?? null);
    });
    return obj as T;
  });
}

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  // Detect old single-user schema (no user_id column) and migrate
  try {
    await execute('SELECT user_id FROM book_progress LIMIT 0');
  } catch {
    await execute('DROP TABLE IF EXISTS book_progress');
  }
  // Create with full schema
  await execute(`
    CREATE TABLE IF NOT EXISTS book_progress (
      user_id   TEXT    NOT NULL,
      book_id   INTEGER NOT NULL,
      is_read   INTEGER DEFAULT 0,
      status    TEXT    DEFAULT 'unread',
      rating    INTEGER,
      read_date TEXT,
      notes     TEXT,
      PRIMARY KEY (user_id, book_id)
    )
  `);
  // Add new columns to existing tables (silently no-op if already present)
  try { await execute("ALTER TABLE book_progress ADD COLUMN status TEXT DEFAULT 'unread'"); } catch {}
  try { await execute("ALTER TABLE book_progress ADD COLUMN notes TEXT"); } catch {}
  // Migrate: existing is_read=1 rows that haven't been given a status yet
  await execute("UPDATE book_progress SET status = 'read' WHERE is_read = 1 AND (status IS NULL OR status = 'unread')");
  schemaReady = true;
}

export interface BookProgress {
  book_id: number;
  is_read: number;
  status: 'unread' | 'reading' | 'read';
  rating: number | null;
  read_date: string | null;
  notes: string | null;
}

export async function getAllProgress(userId: string): Promise<BookProgress[]> {
  await ensureSchema();
  const result = await execute(
    'SELECT book_id, is_read, status, rating, read_date, notes FROM book_progress WHERE user_id = ?',
    [userId],
  );
  return toRows<BookProgress>(result);
}

export async function getOneProgress(userId: string, bookId: number): Promise<BookProgress | null> {
  await ensureSchema();
  const result = await execute(
    'SELECT book_id, is_read, status, rating, read_date, notes FROM book_progress WHERE user_id = ? AND book_id = ?',
    [userId, bookId],
  );
  const rows = toRows<BookProgress>(result);
  return rows[0] ?? null;
}

export async function upsertProgress(
  userId: string,
  bookId: number,
  status: 'unread' | 'reading' | 'read',
  rating?: number | null,
  notes?: string | null,
): Promise<void> {
  await ensureSchema();
  const isRead = status === 'read' ? 1 : 0;
  await execute(
    `INSERT INTO book_progress (user_id, book_id, is_read, status, rating, read_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, book_id) DO UPDATE SET
       is_read   = excluded.is_read,
       status    = excluded.status,
       rating    = CASE WHEN excluded.rating IS NOT NULL THEN excluded.rating ELSE rating END,
       read_date = CASE
         WHEN excluded.status = 'read' AND book_progress.status != 'read'
         THEN excluded.read_date
         ELSE book_progress.read_date
       END,
       notes     = CASE WHEN excluded.notes IS NOT NULL THEN excluded.notes ELSE notes END`,
    [
      userId, bookId, isRead, status,
      rating ?? null,
      status === 'read' ? new Date().toISOString() : null,
      notes ?? null,
    ],
  );
}
