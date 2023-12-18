import * as Decode from "tiny-decoders";
import { JsonError } from "./Helpers";
import { NonEmptyArray } from "./NonEmptyArray";
import { ElmJsonPath, SourceDirectory } from "./Types";
export type ElmJson = ReturnType<typeof ElmJson>;
export declare const ElmJson: Decode.Decoder<{
    tag: "Package";
} | {
    "source-directories"?: unknown;
    tag: "Application";
}, unknown>;
type ParseResult = ParseError | {
    tag: "Parsed";
    elmJson: ElmJson;
};
export type ParseError = {
    tag: "ElmJsonDecodeError";
    elmJsonPath: ElmJsonPath;
    error: JsonError;
} | {
    tag: "ElmJsonReadAsJsonError";
    elmJsonPath: ElmJsonPath;
    error: Error;
};
export declare function readAndParse(elmJsonPath: ElmJsonPath): ParseResult;
export declare function getSourceDirectories(elmJsonPath: ElmJsonPath, elmJson: ElmJson): NonEmptyArray<SourceDirectory>;
export {};
