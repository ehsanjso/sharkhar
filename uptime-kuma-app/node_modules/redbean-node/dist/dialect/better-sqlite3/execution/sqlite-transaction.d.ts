declare const Transaction: any;
declare class Transaction_Sqlite extends Transaction {
    begin(conn: any): any;
}
export = Transaction_Sqlite;
