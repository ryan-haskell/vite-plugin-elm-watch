import { NonEmptyArray } from "./NonEmptyArray";
import type { CliArg, CompilationMode, RunMode } from "./Types";
type ParseArgsResult = {
    tag: "Success";
    compilationMode: CompilationMode;
    targetsSubstrings: Array<string>;
} | {
    tag: "UnknownFlags";
    unknownFlags: NonEmptyArray<CliArg>;
} | {
    tag: "DebugOptimizeClash";
} | {
    tag: "DebugOptimizeForHot";
};
export declare function parseArgs(runMode: RunMode, args: Array<CliArg>): ParseArgsResult;
export {};
