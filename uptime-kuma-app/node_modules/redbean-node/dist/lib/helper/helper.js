"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmptyObject = void 0;
function isEmptyObject(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}
exports.isEmptyObject = isEmptyObject;
