var _a;
import * as util from "util";
/**
 * Like a `Map`, but the keys are looked up by structure instead of by
 * reference.
 *
 * NOTE: The keys must be `JSON.stringify`-able.
 */
export class HashMap {
    constructor(entries) {
        this.map = new Map();
        this[_a] = "HashMap";
        if (entries !== undefined && entries !== null) {
            for (const [key, value] of entries) {
                this.map.set(hash(key), value);
            }
        }
    }
    get size() {
        return this.map.size;
    }
    has(key) {
        return this.map.has(hash(key));
    }
    get(key) {
        return this.map.get(hash(key));
    }
    set(key, value) {
        this.map.set(hash(key), value);
        return this;
    }
    delete(key) {
        return this.map.delete(hash(key));
    }
    clear() {
        this.map.clear();
    }
    /**
     * forEach is not implemented. Use a for-of loop instead.
     */
    // istanbul ignore next
    forEach(callback) {
        return callback;
    }
    *keys() {
        for (const key of this.map.keys()) {
            yield JSON.parse(key);
        }
    }
    values() {
        return this.map.values();
    }
    *entries() {
        for (const [key, value] of this.map.entries()) {
            yield [JSON.parse(key), value];
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    // istanbul ignore next
    [(_a = Symbol.toStringTag, util.inspect.custom)]() {
        return new Map(this);
    }
}
function hash(value) {
    return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1))));
}
