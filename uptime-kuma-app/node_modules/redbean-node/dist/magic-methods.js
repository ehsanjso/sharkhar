"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.magicMethods = void 0;
const redbean_node_1 = require("./redbean-node");
function magicMethods(clazz) {
    let issetEnabled = true;
    const classHandler = Object.create(null);
    classHandler.construct = (target, args, receiver) => {
        const instance = Reflect.construct(target, args, receiver);
        const instanceHandler = Object.create(null);
        const get = Object.getOwnPropertyDescriptor(clazz.prototype, '__get');
        if (get) {
            instanceHandler.get = (target, name, receiver) => {
                issetEnabled = false;
                const exists = Reflect.has(target, name);
                issetEnabled = true;
                if (exists) {
                    return Reflect.get(target, name, receiver);
                }
                else {
                    if (name == "then" && args[1] instanceof redbean_node_1.RedBeanNode) {
                        return undefined;
                    }
                    return get.value.call(target, name);
                }
            };
        }
        const set = Object.getOwnPropertyDescriptor(clazz.prototype, '__set');
        if (set) {
            instanceHandler.set = (target, name, value, receiver) => {
                target.__set.call(target, name, value, receiver);
                return true;
            };
        }
        const defineProperty = Object.getOwnPropertyDescriptor(clazz.prototype, '__defineProperty');
        if (defineProperty) {
            instanceHandler.defineProperty = (target, name, desc) => {
                if (name in target) {
                    Reflect.defineProperty(target, name, desc);
                }
                else {
                    target.__set.call(target, name, desc);
                }
                return target;
            };
        }
        const isset = Object.getOwnPropertyDescriptor(clazz.prototype, '__isset');
        if (isset) {
            instanceHandler.has = (target, name) => {
                if (!issetEnabled)
                    return Reflect.has(target, name);
                return isset.value.call(target, name);
            };
        }
        const unset = Object.getOwnPropertyDescriptor(clazz.prototype, '__unset');
        if (unset) {
            instanceHandler.deleteProperty = (target, name) => {
                return unset.value.call(target, name);
            };
        }
        return new Proxy(instance, instanceHandler);
    };
    if (Object.getOwnPropertyDescriptor(clazz, '__getStatic')) {
        classHandler.get = (target, name, receiver) => {
            if (name in target) {
                return target[name];
            }
            else {
                return undefined;
            }
        };
    }
    if (Object.getOwnPropertyDescriptor(clazz, '__setStatic')) {
        classHandler.set = (target, name, value, receiver) => {
            target.__setStatic.call(receiver, name, value);
            return true;
        };
    }
    return new Proxy(clazz, classHandler);
}
exports.magicMethods = magicMethods;
