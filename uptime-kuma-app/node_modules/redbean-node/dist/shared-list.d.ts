import { LazyLoadArray } from "./lazy-load-array";
import { Bean } from "./bean";
export declare class SharedList extends LazyLoadArray {
    via: string;
    constructor(parentBean: Bean, type: string, via: string);
    push(...items: any[]): number;
    remove(...items: any[]): void;
    toArray(force?: boolean): Promise<Bean[]>;
    store(): Promise<void>;
}
