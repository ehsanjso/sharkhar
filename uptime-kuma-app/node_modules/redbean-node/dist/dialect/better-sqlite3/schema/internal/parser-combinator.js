"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.f = exports.e = exports.t = exports.n = exports.l = exports.o = exports.m = exports.a = exports.s = void 0;
function s(sequence, post = (v) => v) {
    return function ({ index = 0, input }) {
        let position = index;
        const ast = [];
        for (const parser of sequence) {
            const result = parser({ index: position, input });
            if (result.success) {
                position = result.index;
                ast.push(result.ast);
            }
            else {
                return result;
            }
        }
        return { success: true, ast: post(ast), index: position, input };
    };
}
exports.s = s;
function a(alternative, post = (v) => v) {
    return function ({ index = 0, input }) {
        for (const parser of alternative) {
            const result = parser({ index, input });
            if (result.success) {
                return {
                    success: true,
                    ast: post(result.ast),
                    index: result.index,
                    input,
                };
            }
        }
        return { success: false, ast: null, index, input };
    };
}
exports.a = a;
function m(many, post = (v) => v) {
    return function ({ index = 0, input }) {
        let result = {};
        let position = index;
        const ast = [];
        do {
            result = many({ index: position, input });
            if (result.success) {
                position = result.index;
                ast.push(result.ast);
            }
        } while (result.success);
        if (ast.length > 0) {
            return { success: true, ast: post(ast), index: position, input };
        }
        else {
            return { success: false, ast: null, index: position, input };
        }
    };
}
exports.m = m;
function o(optional, post = (v) => v) {
    return function ({ index = 0, input }) {
        const result = optional({ index, input });
        if (result.success) {
            return {
                success: true,
                ast: post(result.ast),
                index: result.index,
                input,
            };
        }
        else {
            return { success: true, ast: post(null), index, input };
        }
    };
}
exports.o = o;
function l(lookahead, post = (v) => v) {
    return function ({ index = 0, input }) {
        const result = lookahead.do({ index, input });
        if (result.success) {
            const resultNext = lookahead.next({ index: result.index, input });
            if (resultNext.success) {
                return {
                    success: true,
                    ast: post(result.ast),
                    index: result.index,
                    input,
                };
            }
        }
        return { success: false, ast: null, index, input };
    };
}
exports.l = l;
function n(negative, post = (v) => v) {
    return function ({ index = 0, input }) {
        const result = negative.do({ index, input });
        if (result.success) {
            const resultNot = negative.not({ index, input });
            if (!resultNot.success) {
                return {
                    success: true,
                    ast: post(result.ast),
                    index: result.index,
                    input,
                };
            }
        }
        return { success: false, ast: null, index, input };
    };
}
exports.n = n;
function t(token, post = (v) => v.text) {
    return function ({ index = 0, input }) {
        const result = input[index];
        if (result !== undefined &&
            (token.type === undefined || token.type === result.type) &&
            (token.text === undefined ||
                token.text.toUpperCase() === result.text.toUpperCase())) {
            return {
                success: true,
                ast: post(result),
                index: index + 1,
                input,
            };
        }
        else {
            return { success: false, ast: null, index, input };
        }
    };
}
exports.t = t;
const e = function ({ index = 0, input }) {
    return { success: true, ast: null, index, input };
};
exports.e = e;
const f = function ({ index = 0, input }) {
    return { success: index === input.length, ast: null, index, input };
};
exports.f = f;
