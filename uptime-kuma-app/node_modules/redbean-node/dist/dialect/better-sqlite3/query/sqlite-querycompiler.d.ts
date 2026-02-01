declare const QueryCompiler: any;
declare class QueryCompiler_SQLite3 extends QueryCompiler {
    constructor(client: any, builder: any, formatter: any);
    insert(): string;
    _ignore(columns: any): string;
    _merge(updates: any, columns: any, insert: any): string;
    truncate(): {
        sql: string;
        output(): any;
    };
    columnInfo(): {
        sql: string;
        output(resp: any): any;
    };
    limit(): string;
}
export = QueryCompiler_SQLite3;
