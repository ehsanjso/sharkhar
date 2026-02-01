export declare function isEmptyObject(obj: LooseObject): boolean;
export interface LooseObject<T = any> {
    [key: string]: T;
}
