declare function s(sequence: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => any;
declare function a(alternative: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: any;
    index: any;
    input: any;
};
declare function m(many: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: any;
    index: number;
    input: any;
};
declare function o(optional: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: any;
    index: any;
    input: any;
};
declare function l(lookahead: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: any;
    index: any;
    input: any;
};
declare function n(negative: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: any;
    index: any;
    input: any;
};
declare function t(token: any, post?: (v: any) => any): ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: any;
    index: number;
    input: any;
};
declare const e: ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: null;
    index: number;
    input: any;
};
declare const f: ({ index, input }: {
    index?: number | undefined;
    input: any;
}) => {
    success: boolean;
    ast: null;
    index: number;
    input: any;
};
export { s, a, m, o, l, n, t, e, f };
