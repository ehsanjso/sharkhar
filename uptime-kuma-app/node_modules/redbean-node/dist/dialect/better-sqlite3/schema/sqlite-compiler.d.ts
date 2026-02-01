declare const SchemaCompiler: any;
declare class SchemaCompiler_SQLite3 extends SchemaCompiler {
    constructor(client: any, builder: any);
    hasTable(tableName: any): void;
    hasColumn(tableName: any, column: any): void;
    renameTable(from: any, to: any): void;
    generateDdlCommands(): Promise<{
        pre: never[];
        sql: any[];
        post: never[];
    }>;
}
export = SchemaCompiler_SQLite3;
