import * as Decode from "tiny-decoders";
import { JsonError } from "./Helpers";
import type { CliArg, Cwd, ElmWatchJsonPath } from "./Types";
export type Config = ReturnType<typeof Config>;
declare const Config: Decode.Decoder<{
    port?: unknown;
    postprocess?: unknown;
    targets: Record<string, {
        inputs?: unknown;
        output: string;
    }>;
}, unknown>;
type ParseResult = {
    tag: "DecodeError";
    elmWatchJsonPath: ElmWatchJsonPath;
    error: JsonError;
} | {
    tag: "ElmWatchJsonNotFound";
} | {
    tag: "Parsed";
    elmWatchJsonPath: ElmWatchJsonPath;
    config: Config;
} | {
    tag: "ReadAsJsonError";
    elmWatchJsonPath: ElmWatchJsonPath;
    error: Error;
};
export declare function findReadAndParse(cwd: Cwd): ParseResult;
export declare function example(cwd: Cwd, elmWatchJsonPath: ElmWatchJsonPath, elmMakeParsed: ElmMakeParsed): string;
type ElmMakeParsed = {
    elmFiles: Array<string>;
    output: string | undefined;
};
export declare function parseArgsLikeElmMake(args: Array<CliArg>): ElmMakeParsed;
export {};
