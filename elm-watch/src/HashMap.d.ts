/// <reference types="node" resolution-mode="require"/>
import * as util from "util";
/**
 * Like a `Map`, but the keys are looked up by structure instead of by
 * reference.
 *
 * NOTE: The keys must be `JSON.stringify`-able.
 */
export declare class HashMap<K extends Record<string, unknown>, V> implements Map<K, V> {
    private map;
    constructor(entries?: ReadonlyArray<readonly [K, V]> | null);
    get size(): number;
    has(key: K): boolean;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): void;
    /**
     * forEach is not implemented. Use a for-of loop instead.
     */
    forEach(callback: never): never;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    [Symbol.toStringTag]: string;
    [util.inspect.custom](): Map<K, V>;
}
