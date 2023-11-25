import { NonEmptyArray } from "./NonEmptyArray";
import { AbsolutePath } from "./Types";
export declare function absolutePathFromString(from: AbsolutePath, ...pathStrings: NonEmptyArray<string>): AbsolutePath;
export declare function absoluteDirname({ absolutePath }: AbsolutePath): AbsolutePath;
/**
 * Note that this can throw fs errors.
 */
export declare function absoluteRealpath({ absolutePath }: AbsolutePath): AbsolutePath;
export declare function findClosest(name: string, absoluteDir: AbsolutePath): AbsolutePath | undefined;
export declare function longestCommonAncestorPath(paths: NonEmptyArray<AbsolutePath>): AbsolutePath | undefined;
