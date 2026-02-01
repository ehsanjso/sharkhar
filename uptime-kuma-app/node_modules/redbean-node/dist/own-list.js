"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnList = void 0;
const lazy_load_array_1 = require("./lazy-load-array");
const bean_1 = require("./bean");
class OwnList extends lazy_load_array_1.LazyLoadArray {
    constructor(parentBean, type, alias) {
        super(parentBean, type);
        this.alias = alias;
    }
    async toArray(force = false) {
        if (!this.parentBean._id) {
            this.devLog("Parent Bean no id", this.parentBean._id);
            return this.list;
        }
        if (!this.loaded || force) {
            this._list = [];
            this.loaded = true;
            let field = bean_1.Bean.dbFieldName(bean_1.Bean.getRelationFieldName(this.alias));
            let condition = " ?? = ? ";
            let data = [
                field,
                this.parentBean._id
            ];
            if (this.withCondition) {
                condition += " AND " + this.withCondition;
                data.push(...this.withConditionData);
            }
            try {
                this._list = await this.R.find(this.type, condition, data);
            }
            catch (error) {
                try {
                    this.R.checkAllowedError(error);
                }
                catch (e) {
                    this.loaded = false;
                    throw e;
                }
            }
        }
        return this.list;
    }
    async store() {
        this.devLog("Store Own List");
        let promiseList = [];
        while (this._pendingAddList.length > 0) {
            let bean = this._pendingAddList.pop();
            if (!bean) {
                continue;
            }
            bean[this.fieldName] = this.parentBean._id;
            promiseList.push(this.R.store(bean));
        }
        while (this._pendingRemoveList.length > 0) {
            let bean = this._pendingRemoveList.pop();
            if (!bean) {
                continue;
            }
            bean[this.fieldName] = null;
            promiseList.push(this.R.store(bean));
        }
        this.loaded = false;
        await this.R.concurrent(promiseList);
    }
    get fieldName() {
        return this.alias + "_id";
    }
}
exports.OwnList = OwnList;
