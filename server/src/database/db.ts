import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

const dbPath = path.resolve(__dirname, '../../data/auction.db');
const DATABASE_URL = process.env.DATABASE_URL || '';

class PersistentDatabase {
  private db: SqlJsDatabase | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private pgPool: Pool | null = null;
  private isPersisting: boolean = false;
  private pendingPersist: boolean = false;

  async init() {
    // 1. Initialize Postgres connection pool if DATABASE_URL is configured
    if (DATABASE_URL) {
      try {
        this.pgPool = new Pool({
          connectionString: DATABASE_URL,
          ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });

        // Ensure persistent snapshots table exists in Postgres
        await this.pgPool.query(`
          CREATE TABLE IF NOT EXISTS system_snapshots (
            id TEXT PRIMARY KEY,
            payload BYTEA NOT NULL,
            updated_at BIGINT NOT NULL
          )
        `);
        console.log('[Postgres] Connected successfully to persistent Render database');
      } catch (pgErr: any) {
        console.error('[Postgres] Connection initialization failed, falling back to local storage:', pgErr.message);
        this.pgPool = null;
      }
    }

    const SQL = await initSqlJs();
    let loadedBuffer: Buffer | null = null;
    let postgresQuerySucceeded = false;
    const postgresConfigured = Boolean(DATABASE_URL);

    // 2. Try restoring latest snapshot directly from Postgres
    if (this.pgPool) {
      try {
        const res = await this.pgPool.query(
          'SELECT payload, updated_at FROM system_snapshots WHERE id = $1',
          ['auction_db']
        );
        postgresQuerySucceeded = true;
        if (res.rows.length > 0 && res.rows[0].payload) {
          loadedBuffer = res.rows[0].payload;
          console.log(`[Postgres] Restored auction database snapshot (${loadedBuffer?.length} bytes, updated: ${new Date(Number(res.rows[0].updated_at)).toISOString()})`);
        } else {
          console.log('[Postgres] No existing snapshot found in system_snapshots (fresh database deployment)');
        }
      } catch (err: any) {
        console.error('[Postgres] Failed to retrieve snapshot from database:', err.message);
      }
    }

    // 3. Fallback to local disk file if Postgres had no snapshot yet
    if (!loadedBuffer && fs.existsSync(dbPath)) {
      try {
        loadedBuffer = fs.readFileSync(dbPath);
        console.log(`[Disk] Restored auction database from local file (${loadedBuffer.length} bytes)`);
      } catch (diskErr: any) {
        console.error('[Disk] Failed reading local file:', diskErr.message);
      }
    }

    const isValidSqlite = (buf: Buffer | null): boolean => {
      if (!buf || buf.length < 100) return false;
      return buf.toString('utf8', 0, 15) === 'SQLite format 3';
    };

    // 4. Initialize SqlJs with validated buffer or clean instance
    if (isValidSqlite(loadedBuffer)) {
      try {
        this.db = new SQL.Database(loadedBuffer!);
        console.log(`[Database] Successfully mounted persistent database (${loadedBuffer!.length} bytes)`);
      } catch (err: any) {
        console.warn('[Database] Snapshot mounting failed, initializing fresh instance:', err.message);
        this.db = new SQL.Database();
        if (!postgresConfigured || postgresQuerySucceeded) {
          this.persist();
        }
      }
    } else {
      this.db = new SQL.Database();
      console.log('[Database] Initialized new clean database instance');
      if (postgresConfigured && !postgresQuerySucceeded) {
        console.warn('[Postgres] CRITICAL: Snapshot fetch failed on boot. SKIPPING persist to prevent overwriting existing data with blank database.');
      } else {
        this.persist();
      }
    }
  }

  public async flushToPostgres(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      if (this.pgPool) {
        await this.pgPool.query(
          `INSERT INTO system_snapshots (id, payload, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
          ['auction_db', buffer, Date.now()]
        );
        console.log('[Postgres] Flushed database snapshot on shutdown successfully');
      }
    } catch (err: any) {
      console.error('[Postgres] Flush on shutdown failed:', err.message);
    }
  }

  private async persist() {
    if (!this.db || this.isPersisting) {
      this.pendingPersist = true;
      return;
    }
    this.isPersisting = true;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);

      // Save to local disk as local backup
      try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dbPath, buffer);
      } catch {
        // Disk write might be ignored on read-only cloud mounts
      }

      // Persist to Postgres database
      if (this.pgPool) {
        await this.pgPool.query(
          `INSERT INTO system_snapshots (id, payload, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
          ['auction_db', buffer, Date.now()]
        );
      }
    } catch (e: any) {
      console.error('Failed to persist database:', e.message);
    } finally {
      this.isPersisting = false;
      if (this.pendingPersist) {
        this.pendingPersist = false;
        this.schedulePersist();
      }
    }
  }

  private schedulePersist() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persist();
    }, 250);
  }

  exec(sql: string) {
    if (!this.db) throw new Error('DB not initialized');
    this.db.run(sql);
    this.schedulePersist();
  }

  prepare(sql: string) {
    const self = this;
    return {
      run(...params: any[]) {
        if (!self.db) throw new Error('DB not initialized');
        self.db.run(sql, params);
        self.schedulePersist();
        return { changes: 1 };
      },
      get(...params: any[]) {
        if (!self.db) throw new Error('DB not initialized');
        const stmt = self.db.prepare(sql);
        try {
          stmt.bind(params);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },
      all(...params: any[]) {
        if (!self.db) throw new Error('DB not initialized');
        const stmt = self.db.prepare(sql);
        const results: any[] = [];
        try {
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      }
    };
  }

  transaction(fn: (...args: any[]) => any) {
    return (...args: any[]) => {
      this.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this.exec('COMMIT');
        return result;
      } catch (err) {
        this.exec('ROLLBACK');
        throw err;
      }
    };
  }
}

const db = new PersistentDatabase();
export default db;
