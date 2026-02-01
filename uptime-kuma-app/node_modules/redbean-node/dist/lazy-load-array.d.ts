import { Bean } from "./bean";
import { RedBeanNode } from "./redbean-node";
import { Knex } from "knex";
import RawBinding = Knex.RawBinding;
export declare abstract class LazyLoadArray {
    protected parentBean: Bean;
    protected type: string;
    protected loaded: boolean;
    protected _pendingAddList: Bean[];
    protected _pendingRemoveList: Bean[];
    protected _list: Bean[];
    withCondition: string;
    withConditionData: RawBinding[];
    protected constructor(parentBean: Bean, type: string);
    abstract toArray(force: boolean): any;
    abstract store(): any;
    push(...items: (Bean)[]): number;
    remove(...items: Bean[]): void;
    protected removeItem(arr: Bean[], value: Bean): Bean[];
    refresh(): any;
    get R(): RedBeanNode;
    protected devLog(...params: any[]): void;
    get list(): Bean[];
    get pendingRemoveList(): Bean[];
    get pendingAddList(): (number | Bean)[];
}
