import * as Decode from "tiny-decoders";
import { JsonError } from "./Helpers";
import { ElmWatchStuffJsonPath } from "./Types";
type Target = ReturnType<typeof Target>;
declare const Target: Decode.Decoder<{
    compilationMode?: unknown;
    browserUiPosition?: unknown;
    openErrorOverlay?: boolean | undefined;
}, unknown>;
export type ElmWatchStuffJson = ReturnType<typeof ElmWatchStuffJson>;
export declare const ElmWatchStuffJson: Decode.Decoder<{
    port?: unknown;
    targets: Record<string, {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        openErrorOverlay?: boolean | undefined;
    }>;
}, unknown>;
export type ElmWatchStuffJsonWritable = {
    port: number;
    targets: Record<string, Required<Target>>;
};
type ParseResult = ParseError | {
    tag: "NoElmWatchStuffJson";
    elmWatchStuffJsonPath: ElmWatchStuffJsonPath;
} | {
    tag: "Parsed";
    elmWatchStuffJsonPath: ElmWatchStuffJsonPath;
    elmWatchStuffJson: ElmWatchStuffJson;
};
type ParseError = {
    tag: "ElmWatchStuffJsonDecodeError";
    error: JsonError;
} | {
    tag: "ElmWatchStuffJsonReadAsJsonError";
    error: Error;
};
export declare function readAndParse(elmWatchStuffJsonPath: ElmWatchStuffJsonPath): ParseResult;
export {};
