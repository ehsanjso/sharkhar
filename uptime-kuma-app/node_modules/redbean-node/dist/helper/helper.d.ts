export declare function isEmptyObject(obj: LooseObject): boolean;
export interface LooseObject<T = any> {
    [key: string]: T;
}
export declare class SlowLogger {
    static enable: boolean;
    static threshold: number;
    private startTime;
    constructor();
    log(sql: any): void;
}
