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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedList = void 0;
const lazy_load_array_1 = require("./lazy-load-array");
class SharedList extends lazy_load_array_1.LazyLoadArray {
    constructor(parentBean, type, via) {
        super(parentBean, type);
        this.via = via;
    }
    push(...items) {
        for (let item of items) {
            if (this.type != item.beanMeta.type) {
                throw new Error("The bean type does not match the shared list type");
            }
        }
        return super.push(...items);
    }
    remove(...items) {
        for (let item of items) {
            if (this.type != item.beanMeta.type) {
                throw new Error("The bean type does not match the shared list type");
            }
        }
        super.remove(...items);
    }
    toArray(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.parentBean._id) {
                this.devLog("Parent Bean no id", this.parentBean._id);
                return this.list;
            }
            if (!this.loaded || force) {
                this._list = [];
                this.loaded = true;
                let id1 = this.type + ".id";
                let id2 = this.via + "." + this.type + "_id";
                let parentBeanFieldName = this.parentBean.beanMeta.type + "_id";
                let queryPromise = this.R.knex.table(this.type).select(this.type + ".*")
                    .join(this.via, id1, "=", id2)
                    .where(parentBeanFieldName, this.parentBean._id);
                if (this.withCondition) {
                    queryPromise.whereRaw(this.withCondition, this.withConditionData);
                }
                this.R.queryLog(queryPromise);
                try {
                    let list = yield queryPromise;
                    console.log("Result length: ", list.length);
                    list = this.R.convertToBeans(this.type, list);
                    for (let item of list) {
                        this.list.push(item);
                    }
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
        });
    }
    store() {
        return __awaiter(this, void 0, void 0, function* () {
            this.devLog("Store Shared List");
            let id1 = this.parentBean.beanMeta.type + "_id";
            let id2 = this.type + "_id";
            while (this._pendingAddList.length > 0) {
                let bean = this._pendingAddList.pop();
                if (!bean) {
                    continue;
                }
                if (!bean.id) {
                    yield this.R.store(bean);
                }
                let viaBean = this.R.dispense(this.via);
                viaBean[id1] = this.parentBean._id;
                viaBean[id2] = bean.id;
                yield this.R.store(viaBean);
            }
            let promiseList = [];
            while (this._pendingRemoveList.length > 0) {
                let bean = this._pendingRemoveList.pop();
                if (!bean || !bean.id) {
                    continue;
                }
                let queryPromise = this.R.knex(this.via)
                    .where(id1, this.parentBean._id)
                    .where(id2, bean.id)
                    .del();
                this.R.queryLog(queryPromise);
                promiseList.push(queryPromise);
            }
            yield this.R.concurrent(promiseList);
        });
    }
}
exports.SharedList = SharedList;
