/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import type { Readable, Writable } from "stream";
import { DecoderError } from "tiny-decoders";
import { NonEmptyArray } from "./NonEmptyArray";
export type ReadStream = Readable & {
    isTTY: boolean;
    isRaw: boolean;
    setRawMode: (mode: boolean) => void;
};
export type WriteStream = Writable & {
    isTTY: boolean;
    columns?: number;
};
/**
 * More type safe version of `Array#join`.
 */
export declare function join(array: Array<string>, separator: string): string;
export declare function split(string: string, splitter: string): NonEmptyArray<string>;
export declare function getSetSingleton<T>(set: Set<T>): T | undefined;
export declare const CLEAR = "\u001B[2J\u001B[3J\u001B[H";
export declare const RESET_COLOR = "\u001B[0m";
export declare function bold(string: string): string;
export declare function dim(string: string): string;
export declare function removeColor(string: string): string;
export declare function cursorHorizontalAbsolute(n: number): string;
export declare function formatDate(date: Date): string;
export declare function formatTime(date: Date): string;
export declare function printFileSize(fileSize: number): string;
export declare function printDurationMs(durationMs: number): string;
export declare function capitalize(string: string): string;
export declare function silentlyReadIntEnvValue(value: string | undefined, defaultValue: number): number;
export declare const toError: ((arg: unknown) => NodeJS.ErrnoException) & {
    jestWorkaround?: (arg: unknown) => NodeJS.ErrnoException;
};
export type JsonError = DecoderError | SyntaxError;
export declare const toJsonError: ((arg: unknown) => JsonError) & {
    jestWorkaround?: (arg: unknown) => JsonError;
};
export declare function unknownErrorToString(error: unknown): string;
