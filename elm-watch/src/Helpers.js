import { DecoderError, repr } from "tiny-decoders";
/**
 * More type safe version of `Array#join`.
 */
export function join(array, separator) {
    return array.join(separator);
}
export function split(string, splitter) {
    return string.split(splitter);
}
export function getSetSingleton(set) {
    return set.size === 1 ? Array.from(set)[0] : undefined;
}
export const CLEAR = "\x1B[2J\x1B[3J\x1B[H";
export const RESET_COLOR = "\x1B[0m";
export function bold(string) {
    return `${RESET_COLOR}\x1B[1m${string}${RESET_COLOR}`;
}
export function dim(string) {
    return `${RESET_COLOR}\x1B[2m${string}${RESET_COLOR}`;
}
export function removeColor(string) {
    return string.replace(/\x1B\[\d+m/g, "");
}
export function cursorHorizontalAbsolute(n) {
    return `\x1B[${n}G`;
}
function pad(number) {
    return number.toString().padStart(2, "0");
}
export function formatDate(date) {
    return join([pad(date.getFullYear()), pad(date.getMonth() + 1), pad(date.getDate())], "-");
}
export function formatTime(date) {
    return join([pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())], ":");
}
const KiB = 1024;
const MiB = 1048576;
export function printFileSize(fileSize) {
    const [divided, unit] = fileSize >= MiB ? [fileSize / MiB, "MiB"] : [fileSize / KiB, "KiB"];
    const string = toFixed(divided).padStart(4, " ");
    return `${string} ${unit}`;
}
const SECOND = 1000;
export function printDurationMs(durationMs) {
    const divided = durationMs / SECOND;
    const [string, unit] = durationMs < SECOND
        ? [durationMs.toString(), "ms"]
        : [toFixed(divided), "s"];
    return `${string} ${unit}`.padStart(6, " ");
}
function toFixed(n) {
    const s1 = n.toFixed(2);
    if (s1.length <= 4) {
        return s1;
    }
    const s2 = n.toFixed(1);
    if (s2.length <= 4) {
        return s2;
    }
    return n.toFixed(0);
}
export function capitalize(string) {
    return string.slice(0, 1).toUpperCase() + string.slice(1);
}
export function silentlyReadIntEnvValue(value, defaultValue) {
    return /^\d+$/.test(value ?? "") ? Number(value) : defaultValue;
}
export const toError = (arg) => 
// Workaround for https://github.com/facebook/jest/issues/2549
// In the tests we overwrite this.
// We could have used the jest-environment-node-single-context npm package,
// but it only works for the `node` environment, not `jsdom`.
// istanbul ignore next
toError.jestWorkaround !== undefined
    ? toError.jestWorkaround(arg)
    : arg instanceof Error
        ? arg
        : new Error(`Caught error not instanceof Error: ${unknownErrorToString(arg)}`);
export const toJsonError = (arg) => 
// istanbul ignore next
arg instanceof DecoderError
    ? arg
    : toError.jestWorkaround !== undefined // See `toError.jestWorkaround`.
        ? toError.jestWorkaround(arg)
        : arg instanceof SyntaxError
            ? arg
            : new SyntaxError(`Caught error not instanceof DecoderError or SyntaxError: ${unknownErrorToString(arg)}`);
export function unknownErrorToString(error) {
    return typeof error?.stack === "string"
        ? error.stack
        : typeof error?.message === "string"
            ? error.message
            : repr(error);
}
