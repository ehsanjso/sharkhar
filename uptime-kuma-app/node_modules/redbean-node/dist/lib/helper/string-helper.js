"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.underscoreToCamelCase = exports.camelCaseToUnderscore = exports.splitCamelCase = void 0;
function splitCamelCase(input) {
    let list = input.match(/^[A-Z]?[^A-Z]*|[A-Z][^A-Z]*/g);
    if (list === null) {
        return [];
    }
    return list.map((item) => {
        return item.toLowerCase();
    });
}
exports.splitCamelCase = splitCamelCase;
function camelCaseToUnderscore(input) {
    return splitCamelCase(input).join("_");
}
exports.camelCaseToUnderscore = camelCaseToUnderscore;
function underscoreToCamelCase(input) {
    return input.split("_").map((word, index) => {
        if (index > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }
        else {
            return word;
        }
    }).join("");
}
exports.underscoreToCamelCase = underscoreToCamelCase;
