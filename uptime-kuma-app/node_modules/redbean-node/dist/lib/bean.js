"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __R, __type, __lock, __chainParentBean, __typeBeanList, __ownListList, __sharedListList, __old;
var Bean_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bean = void 0;
const magic_methods_1 = require("./magic-methods");
const string_helper_1 = require("./helper/string-helper");
const shared_list_1 = require("./shared-list");
const own_list_1 = require("./own-list");
const await_lock_1 = __importDefault(require("await-lock"));
let Bean = Bean_1 = class Bean {
    constructor(type, R) {
        this.beanMeta = new BeanMeta();
        this.beanMeta.R = R;
        this.beanMeta.type = type;
        this.devLog("Instantiate");
    }
    __set(name, value) {
        this.devLog("Set Property:", name, "=", value);
        if (name.startsWith("_")) {
            throw "invalid property name: starts with underscore is not allowed";
        }
        let hasRelationField = (this[Bean_1.getInternalRelationFieldName(name)] !== undefined);
        if (value instanceof Bean_1 || hasRelationField) {
            this.setRelationBean(name, value);
        }
        else {
            let key = Bean_1.internalName(name);
            this.beanMeta.old[key] = this[key];
            this[key] = value;
            if (Bean_1.isRelationField(key)) {
                this.devLog("It is a relation field");
                let type = Bean_1.getTypeFromRelationField(key);
                delete this.beanMeta.typeBeanList[type];
            }
        }
    }
    __get(name) {
        this.devLog("__get:", name);
        if (name.startsWith("_")) {
            return undefined;
        }
        this.devLog("Get Property:", name);
        let relationFieldName = Bean_1.getInternalRelationFieldName(name);
        this.devLog("Convert to relation field name, see is there any relation id:", relationFieldName);
        if (this.beanMeta.isChainBean()) {
            this.devLog("this.beanMeta.fetchAs:", this.beanMeta.fetchAs);
        }
        let id = this[relationFieldName];
        if (id !== undefined || this.beanMeta.fetchAs) {
            this.devLog("Relation Bean Property detected");
            let alias = name;
            let type = name;
            if (this.beanMeta.fetchAs) {
                type = this.beanMeta.fetchAs;
            }
            return this.getRelationBean(alias, type, this.beanMeta.noCache);
        }
        else if (Bean_1.isOwnListProperty(name)) {
            this.devLog("ownList Property detected");
            let alias = this.beanMeta.type;
            let type = Bean_1.getTypeFromOwnListProperty(name);
            this.devLog("type =", type);
            if (this.beanMeta.alias) {
                alias = this.beanMeta.alias;
            }
            return this.ownList(type, alias, this.beanMeta.noCache);
        }
        else if (Bean_1.isSharedListProperty(name)) {
            this.devLog("sharedList Property detected");
            let type = Bean_1.getTypeFromSharedListProperty(name);
            return this.sharedList(type, this.beanMeta.noCache);
        }
        else {
            let key = Bean_1.internalName(name);
            return this[key];
        }
    }
    __isset(name) {
        this.devLog("Check isset property of ", name);
        return (this[Bean_1.internalName(name)]) ? true : false;
    }
    setRelationBean(alias, bean) {
        if (bean) {
            if (bean.id) {
                if (this.getType() == bean.getType() && this.id === bean.id) {
                    throw "Error: self reference detected";
                }
                this[Bean_1.getRelationFieldName(alias)] = bean.id;
            }
            this.beanMeta.typeBeanList[alias] = bean;
        }
        else {
            delete this.beanMeta.typeBeanList[alias];
            this[Bean_1.getRelationFieldName(alias)] = null;
        }
    }
    getRelationBean(alias, type, force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.devLog("Getting relation bean:", alias, type, force);
            if (!type) {
                type = alias;
            }
            let fieldName = Bean_1.getInternalRelationFieldName(alias);
            this.devLog("Relation Field Name:", fieldName);
            if (!this.beanMeta.typeBeanList[type] || force) {
                let id = this[fieldName];
                if (!id) {
                    this.devLog("Return null, id = ", id);
                    return null;
                }
                this.beanMeta.typeBeanList[type] = yield this.R.load(type, id);
            }
            return this.beanMeta.typeBeanList[type];
        });
    }
    ownList(type, alias, force = false) {
        let key = type + "_" + alias;
        if (!this.beanMeta.ownListList[key] || force) {
            this.beanMeta.ownListList[key] = new own_list_1.OwnList(this, type, alias);
            if (this.beanMeta.withCondition) {
                this.beanMeta.ownListList[key].withCondition = this.beanMeta.withCondition;
                this.beanMeta.ownListList[key].withConditionData = this.beanMeta.withConditionData;
            }
        }
        return this.beanMeta.ownListList[key];
    }
    sharedList(type, force = false) {
        let via;
        if (this.beanMeta.via) {
            via = this.beanMeta.via;
        }
        else {
            let typeList = [this.beanMeta.type, type].sort(function (a, b) {
                return ('' + a).localeCompare(b);
            });
            via = typeList[0] + "_" + typeList[1];
        }
        if (!this.beanMeta.sharedListList[via]) {
            this.beanMeta.sharedListList[via] = new shared_list_1.SharedList(this, type, via);
            if (this.beanMeta.withCondition) {
                this.beanMeta.sharedListList[via].withCondition = this.beanMeta.withCondition;
                this.beanMeta.sharedListList[via].withConditionData = this.beanMeta.withConditionData;
            }
        }
        return this.beanMeta.sharedListList[via];
    }
    storeTypeBeanList() {
        return __awaiter(this, void 0, void 0, function* () {
            this.devLog("storeTypeBeanList");
            for (let type in this.beanMeta.typeBeanList) {
                let bean = this.beanMeta.typeBeanList[type];
                if (!bean.id) {
                    yield this.R.store(bean);
                }
                this[Bean_1.getRelationFieldName(type)] = bean.id;
            }
        });
    }
    storeSharedList() {
        return __awaiter(this, void 0, void 0, function* () {
            let promiseList = [];
            for (let key in this.beanMeta.sharedListList) {
                let sharedList = this.beanMeta.sharedListList[key];
                if (sharedList instanceof shared_list_1.SharedList) {
                    promiseList.push(sharedList.store());
                }
            }
            yield this.R.concurrent(promiseList);
        });
    }
    storeOwnList() {
        return __awaiter(this, void 0, void 0, function* () {
            let promiseList = [];
            for (let key in this.beanMeta.ownListList) {
                let ownList = this.beanMeta.ownListList[key];
                if (ownList instanceof own_list_1.OwnList) {
                    promiseList.push(ownList.store());
                }
            }
            yield this.R.concurrent(promiseList);
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            let updatedBean = yield this.R.load(this.beanMeta.type, this.id);
            if (updatedBean != null) {
                this.import(updatedBean.export());
                this.beanMeta.refresh();
            }
            else {
            }
        });
    }
    import(obj) {
        this.devLog("Import");
        for (let key in obj) {
            if (key !== "beanMeta") {
                if (obj[key] instanceof Date) {
                    if (obj[key].getHours() == 0 && obj[key].getMinutes() == 0 && obj[key].getSeconds() == 0) {
                        obj[key] = this.R.isoDate(obj[key]);
                    }
                    else {
                        obj[key] = this.R.isoDateTime(obj[key]);
                    }
                }
                this[key] = obj[key];
            }
        }
    }
    export(camelCase = true) {
        let obj = {};
        for (let key in this) {
            if (key !== "beanMeta") {
                if (camelCase) {
                    obj[Bean_1.removePrefixUnderscore(key)] = this[key];
                }
                else {
                    obj[Bean_1.dbFieldName(key)] = this[key];
                }
            }
        }
        return obj;
    }
    fetchAs(type) {
        this.devLog("fetchAs:", type);
        let chainBean = this.createChainBean();
        chainBean.beanMeta.fetchAs = type;
        return chainBean;
    }
    alias(alias) {
        this.devLog("alias:", alias);
        let chainBean = this.createChainBean();
        chainBean.beanMeta.alias = alias;
        return chainBean;
    }
    via(via) {
        let chainBean = this.createChainBean();
        chainBean.beanMeta.via = via;
        return chainBean;
    }
    withCondition(condition, data = []) {
        let chainBean = this.createChainBean();
        chainBean.beanMeta.withCondition = condition;
        chainBean.beanMeta.withConditionData = data;
        return chainBean;
    }
    with(value, data = []) {
        return this.withCondition(" 1=1 " + value, data);
    }
    createChainBean() {
        if (this.beanMeta.isChainBean()) {
            this.devLog("I am a chain bean");
            return this;
        }
        else {
            this.devLog("Create a chain bean");
            let chainBean = this.R.duplicate(this, false);
            chainBean.id = this.id;
            chainBean.beanMeta.chainParentBean = this;
            chainBean.beanMeta.noCache = true;
            return chainBean;
        }
    }
    getType() {
        return this.beanMeta.type;
    }
    get R() {
        return this.beanMeta.R;
    }
    static isOwnListProperty(name) {
        return name.startsWith("own") && name.endsWith("List");
    }
    static getTypeFromOwnListProperty(name) {
        if (this.isOwnListProperty(name)) {
            return name.slice(3, name.length - 4).toLowerCase();
        }
        else {
            throw name + " is not an own list property!";
        }
    }
    static isSharedListProperty(name) {
        return name.startsWith("shared") && name.endsWith("List");
    }
    static getTypeFromSharedListProperty(name) {
        if (this.isSharedListProperty(name)) {
            return name.slice(6, name.length - 4).toLowerCase();
        }
        else {
            throw name + " is not an shared list property!";
        }
    }
    static isRelationField(name) {
        return name.endsWith("Id");
    }
    static getInternalRelationFieldName(type) {
        return Bean_1.prefixUnderscore(Bean_1.getRelationFieldName(type));
    }
    static getRelationFieldName(type) {
        return type + "Id";
    }
    static prefixUnderscore(name) {
        return "_" + name;
    }
    static getTypeFromRelationField(name) {
        let s = name;
        if (s.endsWith("Id")) {
            s = s.slice(0, s.length - 2);
        }
        return Bean_1.removePrefixUnderscore(s);
    }
    static removePrefixUnderscore(name) {
        if (name.startsWith("_")) {
            return name.slice(1);
        }
        else {
            return name;
        }
    }
    static dbFieldName(name) {
        return Bean_1.removePrefixUnderscore(string_helper_1.camelCaseToUnderscore(name));
    }
    static internalName(name) {
        return Bean_1.prefixUnderscore(string_helper_1.underscoreToCamelCase(name));
    }
    devLog(...params) {
        if (this.R.devDebug) {
            console.log("[" + this.beanMeta.type, this._id + "]", ...params);
        }
    }
    isTainted() {
        return Object.keys(this.beanMeta.old).length > 0;
    }
};
Bean = Bean_1 = __decorate([
    magic_methods_1.magicMethods
], Bean);
exports.Bean = Bean;
class BeanMeta {
    constructor() {
        __R.set(this, void 0);
        __type.set(this, void 0);
        __lock.set(this, new await_lock_1.default());
        __chainParentBean.set(this, void 0);
        this.noCache = false;
        this.fetchAs = "";
        this.alias = "";
        this.via = "";
        this.withCondition = "";
        this.withConditionData = [];
        __typeBeanList.set(this, {});
        __ownListList.set(this, {});
        __sharedListList.set(this, {});
        __old.set(this, {});
    }
    get R() {
        return __classPrivateFieldGet(this, __R);
    }
    set R(value) {
        __classPrivateFieldSet(this, __R, value);
    }
    get typeBeanList() {
        return __classPrivateFieldGet(this, __typeBeanList);
    }
    get type() {
        return __classPrivateFieldGet(this, __type);
    }
    set type(value) {
        if (value.match(/^[a-zA-Z0-9_-]+$/) == null) {
            throw `type name '${value}' is not allowed`;
        }
        __classPrivateFieldSet(this, __type, value);
    }
    get ownListList() {
        return __classPrivateFieldGet(this, __ownListList);
    }
    get sharedListList() {
        return __classPrivateFieldGet(this, __sharedListList);
    }
    set chainParentBean(value) {
        __classPrivateFieldSet(this, __chainParentBean, value);
    }
    isChainBean() {
        return (__classPrivateFieldGet(this, __chainParentBean)) ? true : false;
    }
    get old() {
        return __classPrivateFieldGet(this, __old);
    }
    set old(value) {
        __classPrivateFieldSet(this, __old, value);
    }
    clearCache() {
        __classPrivateFieldSet(this, __typeBeanList, {});
        __classPrivateFieldSet(this, __ownListList, {});
        __classPrivateFieldSet(this, __sharedListList, {});
    }
    clearHistory() {
        __classPrivateFieldSet(this, __old, {});
    }
    refresh() {
        this.clearCache();
        this.clearHistory();
    }
    get lock() {
        return __classPrivateFieldGet(this, __lock);
    }
}
__R = new WeakMap(), __type = new WeakMap(), __lock = new WeakMap(), __chainParentBean = new WeakMap(), __typeBeanList = new WeakMap(), __ownListList = new WeakMap(), __sharedListList = new WeakMap(), __old = new WeakMap();
