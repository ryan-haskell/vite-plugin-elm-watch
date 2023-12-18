var _a;
import * as util from "util";
/**
 * Like a `Set`, but the items are looked up by structure instead of by
 * reference.
 *
 * NOTE: The items must be `JSON.stringify`-able.
 */
export class HashSet {
    constructor(values) {
        this._set = new Set();
        this[_a] = "HashSet";
        if (values !== undefined && values !== null) {
            for (const value of values) {
                this._set.add(hash(value));
            }
        }
    }
    get size() {
        return this._set.size;
    }
    has(value) {
        return this._set.has(hash(value));
    }
    add(value) {
        this._set.add(hash(value));
        return this;
    }
    delete(value) {
        return this._set.delete(hash(value));
    }
    clear() {
        this._set.clear();
    }
    /**
     * forEach is not implemented. Use a for-of loop instead.
     */
    // istanbul ignore next
    forEach(callback) {
        return callback;
    }
    *keys() {
        for (const value of this._set.keys()) {
            yield JSON.parse(value);
        }
    }
    values() {
        return this.keys();
    }
    *entries() {
        for (const value of this.keys()) {
            yield [value, value];
        }
    }
    [Symbol.iterator]() {
        return this.keys();
    }
    // istanbul ignore next
    [(_a = Symbol.toStringTag, util.inspect.custom)]() {
        return new Set(this);
    }
}
function hash(value) {
    return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1))));
}
