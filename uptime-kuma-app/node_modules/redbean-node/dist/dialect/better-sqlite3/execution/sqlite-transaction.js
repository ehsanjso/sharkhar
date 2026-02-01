"use strict";
const Transaction = require('knex/lib/execution/transaction');
class Transaction_Sqlite extends Transaction {
    begin(conn) {
        if (this.isolationLevel) {
            this.client.logger.warn('sqlite3 only supports serializable transactions, ignoring the isolation level param');
        }
        return this.query(conn, 'BEGIN;');
    }
}
module.exports = Transaction_Sqlite;
