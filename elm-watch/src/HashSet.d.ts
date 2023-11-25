/// <reference types="node" resolution-mode="require"/>
import * as util from "util";
/**
 * Like a `Set`, but the items are looked up by structure instead of by
 * reference.
 *
 * NOTE: The items must be `JSON.stringify`-able.
 */
export declare class HashSet<V extends Record<string, unknown>> implements Set<V> {
    private _set;
    constructor(values?: ReadonlyArray<V> | null);
    get size(): number;
    has(value: V): boolean;
    add(value: V): this;
    delete(value: V): boolean;
    clear(): void;
    /**
     * forEach is not implemented. Use a for-of loop instead.
     */
    forEach(callback: never): never;
    keys(): IterableIterator<V>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[V, V]>;
    [Symbol.iterator](): IterableIterator<V>;
    [Symbol.toStringTag]: string;
    [util.inspect.custom](): Set<V>;
}
