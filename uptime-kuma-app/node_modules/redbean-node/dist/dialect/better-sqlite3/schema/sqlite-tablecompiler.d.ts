declare const TableCompiler: any;
declare class TableCompiler_SQLite3 extends TableCompiler {
    constructor();
    createQuery(columns: any, ifNot: any): void;
    addColumns(columns: any, prefix: any, colCompilers: any): void;
    dropUnique(columns: any, indexName: any): void;
    dropForeign(columns: any, indexName: any): void;
    dropPrimary(constraintName: any): void;
    dropIndex(columns: any, indexName: any): void;
    unique(columns: any, indexName: any): void;
    index(columns: any, indexName: any): void;
    primary(columns: any, constraintName: any): void;
    foreign(foreignInfo: any): void;
    primaryKeys(): string | undefined;
    foreignKeys(): string;
    createTableBlock(): any;
    renameColumn(from: any, to: any): void;
    dropColumn(): void;
}
export = TableCompiler_SQLite3;
