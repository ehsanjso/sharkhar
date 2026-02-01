/// <reference types="node" />
import { PassThrough, TransformCallback } from "stream";
import { QueryBuilder } from "knex";
import { RedBeanNode } from "./redbean-node";
export default class BeanConverterStream extends PassThrough {
    type: any;
    R: any;
    constructor(type: any, R: any);
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void;
    static createStream(type: string, R: RedBeanNode, queryPromise: QueryBuilder): BeanConverterStream;
}
export declare class GetColConverterStream extends PassThrough {
    type: any;
    R: any;
    constructor(type: any, R: any);
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void;
    static createStream(type: string, R: RedBeanNode, queryPromise: QueryBuilder): Promise<BeanConverterStream>;
}
