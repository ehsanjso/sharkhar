import { LazyLoadArray } from "./lazy-load-array";
import { Bean } from "./bean";
export declare class OwnList extends LazyLoadArray {
    alias: string;
    constructor(parentBean: Bean, type: string, alias: string);
    toArray(force?: boolean): Promise<Bean[]>;
    store(): Promise<void>;
    get fieldName(): string;
}
