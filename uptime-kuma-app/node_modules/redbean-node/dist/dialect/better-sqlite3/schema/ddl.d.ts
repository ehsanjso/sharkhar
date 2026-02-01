declare class SQLite3_DDL {
    constructor(client: any, tableCompiler: any, pragma: any, connection: any);
    tableName(): any;
    getColumn(column: any): Promise<any>;
    getTableSql(): any;
    renameTable(): any;
    dropOriginal(): any;
    copyData(iterator: any): Promise<void>;
    createNewTable(sql: any): any;
    _doReplace(sql: any, from: any, to: any): any;
    alterColumn(columns: any): Promise<any>;
    dropColumn(columns: any): Promise<any>;
    dropForeign(columns: any, foreignKeyName: any): Promise<any>;
    dropPrimary(constraintName: any): Promise<any>;
    primary(columns: any, constraintName: any): Promise<any>;
    foreign(foreignInfo: any): Promise<any>;
    alter(newSql: any, createIndices: any, mapRow: any): Promise<void>;
    generateAlterCommands(newSql: any, createIndices: any, mapRow: any): Promise<never[]>;
}
export = SQLite3_DDL;
