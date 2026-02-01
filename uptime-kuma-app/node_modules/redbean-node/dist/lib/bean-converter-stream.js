"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetColConverterStream = void 0;
const stream_1 = require("stream");
class BeanConverterStream extends stream_1.PassThrough {
    constructor(type, R) {
        super({
            readableObjectMode: true,
            writableObjectMode: true,
        });
        this.type = type;
        this.R = R;
    }
    _transform(chunk, encoding, callback) {
        let bean = this.R.convertToBean(this.type, chunk);
        super._transform(bean, encoding, callback);
    }
    static createStream(type, R, queryPromise) {
        let converterStream = new BeanConverterStream(type, R);
        let stream = queryPromise.stream();
        return stream.pipe(converterStream);
    }
}
exports.default = BeanConverterStream;
class GetColConverterStream extends stream_1.PassThrough {
    constructor(type, R) {
        super({
            readableObjectMode: true,
            writableObjectMode: true,
        });
        this.type = type;
        this.R = R;
    }
    _transform(chunk, encoding, callback) {
        let bean = this.R.convertToBean(this.type, chunk);
        super._transform(bean, encoding, callback);
    }
    static createStream(type, R, queryPromise) {
        return new Promise((resolve, reject) => {
            let converterStream = new BeanConverterStream(type, R);
            queryPromise.stream((stream) => {
                resolve(stream.pipe(converterStream));
            }).catch((error) => { });
        });
    }
}
exports.GetColConverterStream = GetColConverterStream;
