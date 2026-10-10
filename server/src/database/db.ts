import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../../data/auction.db');

class SqlJsWrapper {
  private db: SqlJsDatabase | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;

  async init() {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.persist();
    }
  }

  private persist() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('Failed to persist database:', e);
    }
  }

  private schedulePersist() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persist();
    }, 200);
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

const db = new SqlJsWrapper();
export default db;
