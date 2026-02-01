declare function createNewTable(sql: any, tablename: any, alteredName: any): any;
declare function copyData(trx: any, iterator: any, tableName: any, alteredName: any): Promise<any[]>;
declare function copyAllData(sourceTable: any, targetTable: any): string;
declare function dropOriginal(tableName: any): string;
declare function renameTable(tableName: any, alteredName: any): string;
declare function getTableSql(tableName: any): string;
export { copyAllData, createNewTable, dropOriginal, copyData, renameTable, getTableSql, };
