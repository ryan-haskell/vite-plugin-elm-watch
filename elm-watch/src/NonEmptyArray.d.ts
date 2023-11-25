import * as Decode from "tiny-decoders";
export type NonEmptyArray<T> = [T, ...Array<T>];
export declare function NonEmptyArray<T>(decoder: Decode.Decoder<T>): Decode.Decoder<NonEmptyArray<T>>;
export declare function isNonEmptyArray<T>(array: Array<T>): array is NonEmptyArray<T>;
export declare function mapNonEmptyArray<T, U>(array: NonEmptyArray<T>, f: (item: T, index: number) => U): NonEmptyArray<U>;
export declare function flattenNonEmptyArray<T>(array: NonEmptyArray<NonEmptyArray<T>>): NonEmptyArray<T>;
export declare function nonEmptyArrayUniqueBy<T>(f: (item: T) => string, items: NonEmptyArray<T>): NonEmptyArray<T>;
