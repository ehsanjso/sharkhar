"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlowLogger = exports.isEmptyObject = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
function isEmptyObject(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}
exports.isEmptyObject = isEmptyObject;
class SlowLogger {
    constructor() {
        this.startTime = (0, dayjs_1.default)().valueOf();
    }
    log(sql) {
        const time = ((0, dayjs_1.default)().valueOf() - this.startTime);
        if (time >= SlowLogger.threshold) {
            console.log(`[Slow Log][${time}ms] ${sql}`);
        }
    }
}
exports.SlowLogger = SlowLogger;
SlowLogger.enable = false;
SlowLogger.threshold = 10000;
