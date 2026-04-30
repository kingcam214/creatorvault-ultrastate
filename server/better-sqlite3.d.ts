declare module 'better-sqlite3' {
  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
    transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T;
  }
  interface Statement {
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }
  function Database(filename: string, options?: any): Database;
  export = Database;
}
