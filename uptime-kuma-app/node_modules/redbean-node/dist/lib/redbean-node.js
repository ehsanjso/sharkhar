"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.R = exports.RedBeanNode = void 0;
const knex_1 = __importDefault(require("knex"));
const bean_1 = require("./bean");
const helper_1 = require("./helper/helper");
const dayjs_1 = __importDefault(require("dayjs"));
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
const bean_model_1 = require("./bean-model");
const bean_converter_stream_1 = __importDefault(require("./bean-converter-stream"));
const await_lock_1 = __importDefault(require("await-lock"));
class RedBeanNode {
    constructor() {
        this.devDebug = false;
        this._debug = false;
        this._freeze = false;
        this.dbType = "";
        this._modelList = {};
        this.schemaLock = new await_lock_1.default();
    }
    get knex() {
        if (this._transaction) {
            return this._transaction;
        }
        return this._knex;
    }
    isTransaction() {
        return !!this._transaction;
    }
    setup(dbType = 'sqlite', connection = { filename: './dbfile.db' }, pool = {}) {
        if (typeof dbType === "string") {
            if (!pool.min) {
                if (dbType == "sqlite") {
                    pool.min = 1;
                }
                else {
                    pool.min = 2;
                }
            }
            if (!pool.max) {
                if (dbType == "sqlite") {
                    pool.min = 1;
                }
                else {
                    pool.min = 10;
                }
            }
            if (!pool.idleTimeoutMillis) {
                pool.idleTimeoutMillis = 30000;
            }
            if (dbType == "mariadb") {
                dbType = "mysql";
            }
            this.dbType = dbType;
            let useNullAsDefault = (dbType == "sqlite");
            this._knex = knex_1.default({
                client: dbType,
                connection,
                useNullAsDefault,
                pool
            });
        }
        else {
            this._knex = dbType;
            this.dbType = this._knex.client.config.client;
        }
    }
    dispense(type) {
        return this.createBean(type);
    }
    createBean(type, isDispense = true) {
        if (type in this.modelList) {
            let bean = new this.modelList[type](type, this);
            if (isDispense) {
                bean.onDispense();
            }
            return bean;
        }
        else {
            return new bean_1.Bean(type, this);
        }
    }
    freeze(v = true) {
        this._freeze = v;
    }
    debug(v) {
        this._debug = v;
    }
    concurrent(promiseList) {
        return Promise.all(promiseList);
    }
    storeAll(beans, changedFieldsOnly = true) {
        let promiseList = [];
        for (let bean of beans) {
            promiseList.push(this.store(bean, changedFieldsOnly));
        }
        return this.concurrent(promiseList);
    }
    store(bean, changedFieldsOnly = true) {
        return __awaiter(this, void 0, void 0, function* () {
            yield bean.beanMeta.lock.acquireAsync();
            try {
                return yield this.storeCore(bean, changedFieldsOnly);
            }
            finally {
                bean.beanMeta.lock.release();
            }
        });
    }
    storeCore(bean, changedFieldsOnly = true) {
        return __awaiter(this, void 0, void 0, function* () {
            this.devLog("Store", bean.beanMeta.type, bean.id);
            yield bean.storeTypeBeanList();
            if (bean instanceof bean_model_1.BeanModel) {
                bean.onUpdate();
            }
            if (!this._freeze) {
                yield this.updateTableSchema(bean);
            }
            let obj = bean.export(false);
            delete obj.id;
            if (bean.id) {
                if (changedFieldsOnly) {
                    for (let key in obj) {
                        if (!(bean_1.Bean.internalName(key) in bean.beanMeta.old)) {
                            this.devLog(key + " is not updated");
                            delete obj[key];
                        }
                    }
                }
                this.devLog("values to be updated:");
                this.devLog(obj);
                if (!helper_1.isEmptyObject(obj)) {
                    let queryPromise = this.knex(bean.getType()).where({ id: bean.id }).update(obj);
                    this.queryLog(queryPromise);
                    yield queryPromise;
                }
                else {
                    this.devLog("Empty obj, no need to make query");
                }
            }
            else {
                let queryPromise = this.knex(bean.getType()).insert(obj);
                if (this.dbType == "mssql") {
                    queryPromise = queryPromise.returning('id');
                }
                this.queryLog(queryPromise);
                let result = yield queryPromise;
                bean.id = result[0];
            }
            yield bean.storeSharedList();
            yield bean.storeOwnList();
            bean.beanMeta.old = {};
            if (bean instanceof bean_model_1.BeanModel) {
                bean.onAfterUpdate();
            }
            return bean.id;
        });
    }
    updateTableSchema(bean, changedFieldsOnly = true) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.schemaLock.acquireAsync();
            try {
                yield this.updateTableSchemaCore(bean);
            }
            finally {
                this.schemaLock.release();
            }
        });
    }
    updateTableSchemaCore(bean) {
        return __awaiter(this, void 0, void 0, function* () {
            this.devLog("Check Update Table Schema");
            if (!this._knex) {
                throw "Error: Please execute R.setup(.....) first.";
            }
            let exists = yield this.hasTable(bean.getType());
            if (!exists) {
                this.debugLog("Create table: " + bean.getType());
                try {
                    let queryPromise = this._knex.schema.createTable(bean.getType(), function (table) {
                        table.increments().primary();
                    });
                    this.queryLog(queryPromise);
                    yield queryPromise;
                }
                catch (error) {
                    this.checkAllowedSchemaError(error);
                }
            }
            let columnInfo = yield this.inspect(bean.getType());
            try {
                let queryPromise = this._knex.schema.table(bean.getType(), (table) => __awaiter(this, void 0, void 0, function* () {
                    let obj = bean.export(false);
                    for (let fieldName in obj) {
                        let value = obj[fieldName];
                        let addField = false;
                        let alterField = false;
                        let valueType = this.getDataType(value, fieldName);
                        this.devLog("Best column type =", valueType);
                        if (!columnInfo.hasOwnProperty(fieldName)) {
                            addField = true;
                        }
                        else if (!this.isValidType(columnInfo[fieldName].type, valueType)) {
                            this.debugLog(`Alter column is needed: ${fieldName} (dbType: ${columnInfo[fieldName].type}) (valueType: ${valueType})`);
                            addField = true;
                            alterField = true;
                        }
                        if (addField) {
                            let col;
                            if (valueType == "integer") {
                                this.debugLog("Create field (Int): " + fieldName);
                                col = table.integer(fieldName);
                            }
                            else if (valueType == "bigInteger") {
                                this.debugLog("Create field (bigInteger): " + fieldName);
                                col = table.bigInteger(fieldName);
                            }
                            else if (valueType == "float") {
                                this.debugLog("Create field (Float): " + fieldName);
                                col = table.float(fieldName);
                            }
                            else if (valueType == "boolean") {
                                this.debugLog("Create field (Boolean): " + fieldName);
                                col = table.boolean(fieldName);
                            }
                            else if (valueType == "text") {
                                this.debugLog("Create field (Text): " + fieldName);
                                col = table.text(fieldName, "longtext");
                            }
                            else if (valueType == "datetime") {
                                this.debugLog("Create field (Datetime): " + fieldName);
                                col = table.dateTime(fieldName);
                            }
                            else if (valueType == "date") {
                                this.debugLog("Create field (Date): " + fieldName);
                                col = table.date(fieldName);
                            }
                            else if (valueType == "time") {
                                this.debugLog("Create field (Time): " + fieldName);
                                col = table.time(fieldName);
                            }
                            else {
                                this.debugLog("Create field (String): " + fieldName);
                                col = table.string(fieldName);
                            }
                            if (alterField) {
                                this.debugLog("This is modify column");
                                col.alter();
                            }
                            if (fieldName.endsWith("_id")) {
                                table.index(fieldName);
                            }
                        }
                    }
                }));
                this.queryLog(queryPromise);
                yield queryPromise;
            }
            catch (error) {
                this.checkAllowedSchemaError(error);
            }
        });
    }
    getDataType(value, fieldName = "") {
        let type = typeof value;
        this.devLog("Date Type of", value, "=", type);
        if (fieldName.endsWith("_id")) {
            return "integer";
        }
        if (type == "boolean") {
            return "boolean";
        }
        else if (type == "number") {
            if (Number.isInteger(value)) {
                if (value > 2147483647) {
                    return "bigInteger";
                }
                else if ((this.dbType == "mysql" || this.dbType == "mssql") && (value == 1 || value == 0)) {
                    return "boolean";
                }
                else {
                    return "integer";
                }
            }
            else {
                return "float";
            }
        }
        else if (type == "string") {
            if (value.length > 230) {
                return "text";
            }
            else {
                if (this.isDateTime(value)) {
                    return "datetime";
                }
                else if (this.isDate(value)) {
                    return "date";
                }
                else if (this.isTime(value)) {
                    return "time";
                }
                return "varchar";
            }
        }
        else {
            return "varchar";
        }
    }
    isValidType(columnType, valueType) {
        this.devLog("isValidType", columnType, valueType);
        if (columnType == "boolean" || columnType == "tinyint" || columnType == "bit") {
            if (valueType == "integer" || valueType == "float" || valueType == "varchar" ||
                valueType == "text" || valueType == "bigInteger" ||
                valueType == "datetime" || valueType == "date" || valueType == "time") {
                return false;
            }
        }
        if (columnType == "integer" || columnType == "int") {
            if (valueType == "float" || valueType == "varchar" || valueType == "text" || valueType == "bigInteger" ||
                valueType == "datetime" || valueType == "date" || valueType == "time") {
                return false;
            }
        }
        if (columnType == "bigInteger" || columnType == "bigint") {
            if (valueType == "float" || valueType == "varchar" || valueType == "text" ||
                valueType == "datetime" || valueType == "date" || valueType == "time") {
                return false;
            }
        }
        if (columnType == "float") {
            if (valueType == "varchar" || valueType == "text" ||
                valueType == "datetime" || valueType == "date" || valueType == "time") {
                return false;
            }
        }
        if (columnType == "time") {
            if (valueType == "varchar" || valueType == "text" ||
                valueType == "datetime" || valueType == "date") {
                return false;
            }
        }
        if (columnType == "date") {
            if (valueType == "varchar" || valueType == "text" ||
                valueType == "datetime") {
                return false;
            }
        }
        if (columnType == "datetime" || columnType == "datetime2") {
            if (valueType == "varchar" || valueType == "text") {
                return false;
            }
        }
        if (columnType == "varchar" || columnType == "nvarchar") {
            if (valueType == "text") {
                return false;
            }
        }
        return true;
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.knex.destroy();
        });
    }
    load(type, id) {
        return this.findOne(type, " id = ?", [
            id
        ]);
    }
    normalizeErrorMsg(error) {
        if (this.dbType == "sqlite") {
            return error.message;
        }
        else if (this.dbType == "mysql") {
            return error.code;
        }
        else if (this.dbType == "mssql") {
            return error.message;
        }
        return error;
    }
    checkError(error, allowedErrorList) {
        this.devLog(error);
        let msg = this.normalizeErrorMsg(error);
        for (let allowedError of allowedErrorList) {
            if (Array.isArray(allowedError)) {
                let allMatch = true;
                for (let s of allowedError) {
                    if (!msg.includes(s)) {
                        allMatch = false;
                        break;
                    }
                }
                if (allMatch) {
                    return;
                }
            }
            else if (msg.includes(allowedError)) {
                return;
            }
        }
        throw error;
    }
    checkAllowedError(error) {
        this.devLog("Check Allowed Error for bean query");
        this.checkError(error, [
            "SQLITE_ERROR: no such table:",
            "ER_NO_SUCH_TABLE",
            "Invalid object name",
        ]);
    }
    checkAllowedSchemaError(error) {
        this.devLog("Check Schema Error");
        this.checkError(error, [
            ["SQLITE_ERROR: table ", "already exists"],
            "SQLITE_ERROR: duplicate column name:",
            "ER_TABLE_EXISTS_ERROR",
            "ER_DUP_FIELDNAME"
        ]);
    }
    trash(bean) {
        return __awaiter(this, void 0, void 0, function* () {
            if (bean.id) {
                if (bean instanceof bean_model_1.BeanModel) {
                    bean.onDelete();
                }
                let queryPromise = this.knex.table(bean.getType()).where({ id: bean.id }).delete();
                this.queryLog(queryPromise);
                yield queryPromise;
                bean.id = 0;
                if (bean instanceof bean_model_1.BeanModel) {
                    bean.onAfterDelete();
                }
            }
        });
    }
    trashAll(beans) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let bean of beans) {
                yield this.trash(bean);
            }
        });
    }
    findCore(type, clause, data = []) {
        let queryPromise = this.knex.table(type).whereRaw(clause, data);
        this.queryLog(queryPromise);
        return queryPromise;
    }
    find(type, clause = "", data = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let list = yield this.findCore(type, clause, data);
                return this.convertToBeans(type, list);
            }
            catch (error) {
                this.checkAllowedError(error);
                return [];
            }
        });
    }
    findStream(type, clause = "", data = []) {
        return bean_converter_stream_1.default.createStream(type, this, this.findCore(type, clause, data));
    }
    findAllCore(type, clause, data = []) {
        return this.findCore(type, " 1=1 " + clause, data);
    }
    findAll(type, clause = "", data = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let list = yield this.findAllCore(type, clause, data);
                return this.convertToBeans(type, list);
            }
            catch (error) {
                this.checkAllowedError(error);
                return [];
            }
        });
    }
    findAllStream(type, clause, data = []) {
        return bean_converter_stream_1.default.createStream(type, this, this.findAllCore(type, clause, data));
    }
    findOne(type, clause = "", data = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let queryPromise = this.knex.table(type).whereRaw(clause, data).first();
            this.queryLog(queryPromise);
            let obj;
            try {
                obj = yield queryPromise;
            }
            catch (error) {
                this.checkAllowedError(error);
            }
            if (!obj) {
                return null;
            }
            let bean = this.convertToBean(type, obj);
            return bean;
        });
    }
    convertToBean(type, obj) {
        this.devLog("convertToBean", type, obj);
        let isDispense;
        if (obj.id) {
            isDispense = false;
        }
        else {
            isDispense = true;
        }
        let bean = this.createBean(type, isDispense);
        bean.import(obj);
        if (!isDispense && bean instanceof bean_model_1.BeanModel) {
            bean.onOpen();
        }
        return bean;
    }
    convertToBeans(type, objList) {
        let list = [];
        objList.forEach((obj) => {
            if (obj != null) {
                list.push(this.convertToBean(type, obj));
            }
        });
        return list;
    }
    exec(sql, data = []) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.normalizeRaw(sql, data);
        });
    }
    getAll(sql, data = []) {
        return this.normalizeRaw(sql, data);
    }
    getAllStream(sql, data = []) {
        return this.normalizeRawCore(sql, data).stream();
    }
    getRow(sql, data = [], autoLimit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (autoLimit) {
                if (this.dbType == "mssql") {
                    if (sql.trim().toLowerCase().startsWith("select ")) {
                        sql = sql.replace(/select/i, '$& TOP 1');
                    }
                }
                else {
                    let limitTemplate = this.knex.limit(1).toSQL().toNative();
                    sql = sql + limitTemplate.sql.replace("select *", "");
                    data = data.concat(limitTemplate.bindings);
                }
            }
            this.queryLog(sql);
            let result = yield this.normalizeRaw(sql, data);
            if (result.length > 0) {
                return result[0];
            }
            else {
                return null;
            }
        });
    }
    normalizeRawCore(sql, data) {
        let queryPromise = this.knex.raw(sql, data);
        this.queryLog(queryPromise);
        return queryPromise;
    }
    normalizeRaw(sql, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.normalizeRawCore(sql, data);
            this.queryLog(sql);
            if (this.dbType == "mysql") {
                result = result[0];
            }
            return result;
        });
    }
    getCol(sql, data = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = yield this.getAll(sql, data);
            let key;
            return list.map((obj) => {
                if (!key) {
                    for (let k in obj) {
                        key = k;
                        break;
                    }
                }
                return obj[key];
            });
        });
    }
    getCell(sql, data = [], autoLimit = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let row = yield this.getRow(sql, data, autoLimit);
            if (row) {
                return Object.values(row)[0];
            }
            else {
                return null;
            }
        });
    }
    getAssoc(sql, data = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = yield this.getAll(sql, data);
            let keyKey;
            let valueKey;
            let obj = {};
            if (list.length > 0) {
                let keys = Object.keys(list[0]);
                keyKey = keys[0];
                valueKey = keys[1];
                for (let i = 0; i < list.length; i++) {
                    let key = list[i][keyKey];
                    let value = list[i][valueKey];
                    obj[key] = value;
                }
            }
            return obj;
        });
    }
    count(type, clause = "", data = [], autoLimit = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let where = "";
            if (clause) {
                where = "WHERE " + clause;
            }
            try {
                return yield this.getCell(`SELECT COUNT(*) FROM ?? ${where}`, [
                    type,
                    ...data,
                ], autoLimit);
            }
            catch (error) {
                this.checkAllowedError(error);
                return 0;
            }
        });
    }
    inspect(type) {
        let queryPromise = this.knex.table(type).columnInfo();
        this.queryLog(queryPromise);
        return queryPromise;
    }
    begin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._freeze) {
                console.warn("Warning: Transaction is not working in non-freeze mode.");
                return this;
            }
            if (this._transaction) {
                throw "Previous transaction is not committed";
            }
            let redBeanNode = new RedBeanNode();
            redBeanNode.setup(this._knex);
            redBeanNode._debug = this._debug;
            redBeanNode._freeze = this._freeze;
            redBeanNode.devDebug = this.devDebug;
            redBeanNode._transaction = yield this.knex.transaction();
            return redBeanNode;
        });
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._transaction) {
                yield this._transaction.commit();
                this._transaction = null;
            }
        });
    }
    rollback() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._transaction) {
                yield this._transaction.rollback();
                this._transaction = null;
            }
        });
    }
    transaction(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            let trx = yield this.begin();
            try {
                yield callback(trx);
                yield trx.commit();
            }
            catch (error) {
                yield trx.rollback();
            }
        });
    }
    devLog(...params) {
        if (this.devDebug) {
            console.log("[R]", ...params);
        }
    }
    debugLog(...params) {
        if (this.isDebug()) {
            console.log("[R]", ...params);
        }
    }
    queryLog(queryPromise) {
        if (this._debug) {
            let sql;
            if (typeof queryPromise === "string") {
                sql = queryPromise;
            }
            else {
                sql = queryPromise.toString();
            }
            console.log('\x1b[36m%s\x1b[0m', "Query:", sql);
        }
    }
    duplicate(targetBean, deepCopy = true) {
        let bean = this.dispense(targetBean.beanMeta.type);
        bean.import(targetBean.export());
        bean.id = undefined;
        if (!deepCopy) {
            return bean;
        }
        throw "Error: deep copy not implemented yet";
    }
    hasTable(tableName) {
        let queryPromise = this.knex.schema.hasTable(tableName);
        this.queryLog(queryPromise);
        return queryPromise;
    }
    isFrozen() {
        return this._freeze;
    }
    isDebug() {
        return this._debug;
    }
    isoDateTime(dateTime = undefined) {
        let dayjsObject;
        if (dateTime instanceof dayjs_1.default) {
            dayjsObject = dateTime;
        }
        else {
            dayjsObject = dayjs_1.default(dateTime);
        }
        return dayjsObject.format('YYYY-MM-DD HH:mm:ss');
    }
    isoDate(date = undefined) {
        let dayjsObject;
        if (date instanceof dayjs_1.default) {
            dayjsObject = date;
        }
        else {
            dayjsObject = dayjs_1.default(date);
        }
        return dayjsObject.format('YYYY-MM-DD');
    }
    isoTime(date = undefined) {
        let dayjsObject;
        if (date instanceof dayjs_1.default) {
            dayjsObject = date;
        }
        else {
            dayjsObject = dayjs_1.default(date);
        }
        return dayjsObject.format('HH:mm:ss');
    }
    isDate(value) {
        let format = "YYYY-MM-DD";
        return dayjs_1.default(value, format).format(format) === value;
    }
    isDateTime(value) {
        let format = "YYYY-MM-DD HH:mm:ss";
        return dayjs_1.default(value, format).format(format) === value;
    }
    isTime(value) {
        value = "2020-10-20 " + value;
        let format = "YYYY-MM-DD HH:mm:ss";
        return dayjs_1.default(value, format).format(format) === value;
    }
    autoloadModels(dir) {
        let tsFileList, jsFileList;
        let isTSNode = !!process[Symbol.for("ts-node.register.instance")];
        let ext, fileList;
        if (isTSNode) {
            ext = ".ts";
        }
        else {
            ext = ".js";
        }
        if (this.devDebug && dir == "./model") {
            fileList = glob_1.default.sync("./lib/model/*" + ext);
        }
        else {
            fileList = glob_1.default.sync(dir + "/*" + ext);
        }
        for (let file of fileList) {
            if (file.endsWith(".d.ts")) {
                continue;
            }
            if (this.devDebug) {
                file = file.replace("lib/", "");
            }
            let info = path_1.default.parse(file);
            let obj = require(path_1.default.resolve(file));
            if ("default" in obj && obj.default.prototype instanceof bean_model_1.BeanModel) {
                this.modelList[info.name] = obj.default;
            }
            else if (obj.prototype instanceof bean_model_1.BeanModel) {
                this.modelList[info.name] = obj;
            }
            else {
                console.log(file, "is not a valid BeanModel, skipped");
            }
        }
    }
    get modelList() {
        return this._modelList;
    }
}
exports.RedBeanNode = RedBeanNode;
exports.R = new RedBeanNode();
