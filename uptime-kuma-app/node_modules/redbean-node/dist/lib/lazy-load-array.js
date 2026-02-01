"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LazyLoadArray = void 0;
class LazyLoadArray {
    constructor(parentBean, type) {
        this.loaded = false;
        this._pendingAddList = [];
        this._pendingRemoveList = [];
        this._list = [];
        this.withCondition = "";
        this.withConditionData = [];
        this.parentBean = parentBean;
        this.type = type;
    }
    push(...items) {
        for (let item of items) {
            this.removeItem(this._pendingRemoveList, item);
        }
        return this._pendingAddList.push(...items);
    }
    remove(...items) {
        this.devLog("Remove item from LazyLoadArray");
        for (let item of items) {
            this.removeItem(this._pendingAddList, item);
        }
        this._pendingRemoveList.push(...items);
    }
    removeItem(arr, value) {
        var i = 0;
        while (i < arr.length) {
            if (arr[i] === value || (value.id && arr[i].id === value.id)) {
                arr.splice(i, 1);
            }
            else {
                ++i;
            }
        }
        return arr;
    }
    refresh() {
        return this.toArray(true);
    }
    get R() {
        return this.parentBean.R;
    }
    devLog(...params) {
        if (this.R.devDebug) {
            console.log("[SharedList]", ...params);
        }
    }
    get list() {
        return this._list;
    }
    get pendingRemoveList() {
        return this._pendingRemoveList;
    }
    get pendingAddList() {
        return this._pendingAddList;
    }
}
exports.LazyLoadArray = LazyLoadArray;
