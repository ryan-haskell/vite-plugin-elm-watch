/// <reference types="node" resolution-mode="require"/>
import { ExecException } from "child_process";
import * as ElmMakeError from "./ElmMakeError";
import { Env } from "./Env";
import { JsonError } from "./Helpers";
import { NonEmptyArray } from "./NonEmptyArray";
import { Port } from "./Port";
import { ElmWatchNodePublicArgs, UnknownValueAsString } from "./PostprocessShared";
import { Command, ExitReason } from "./Spawn";
import * as Theme from "./Theme";
import { AbsolutePath, CliArg, Cwd, ElmJsonPath, ElmWatchJsonPath, ElmWatchNodeScriptPath, ElmWatchStuffJsonPath, InputPath, OutputPath, RunMode, UncheckedInputPath, WriteOutputErrorReasonForWriting } from "./Types";
type FancyErrorLocation = ElmJsonPath | ElmWatchJsonPath | ElmWatchNodeScriptPath | ElmWatchStuffJsonPath | OutputPath | {
    tag: "FileWithLineAndColumn";
    file: AbsolutePath;
    line: number;
    column: number;
} | {
    tag: "NoLocation";
};
type Piece = {
    tag: "ElmStyle";
    text: string;
    bold: boolean;
    underline: boolean;
    color?: ElmMakeError.Color;
} | {
    tag: "Bold";
    text: string;
} | {
    tag: "Dim";
    text: string;
} | {
    tag: "Text";
    text: string;
};
type Template = (width: number, renderPiece: (piece: Piece) => string) => string;
export type ErrorTemplate = (width: number, renderPiece: (piece: Piece) => string) => ErrorTemplateData;
type ErrorTemplateData = {
    title: string;
    location: ErrorLocation | undefined;
    content: string;
};
type ErrorLocation = {
    tag: "FileOnly";
    file: AbsolutePath;
} | {
    tag: "FileWithLineAndColumn";
    file: AbsolutePath;
    line: number;
    column: number;
} | {
    tag: "Target";
    targetName: string;
};
export declare const fancyError: (title: string, location: FancyErrorLocation) => (strings: ReadonlyArray<string>, ...values: Array<Piece | Template>) => (width: number, renderPiece: (piece: Piece) => string) => ErrorTemplateData;
export declare const template: (strings: ReadonlyArray<string>, ...values: Array<Piece | Template>) => (width: number, renderPiece: (piece: Piece) => string) => string;
export declare function toTerminalString(errorTemplate: ErrorTemplate, width: number, noColor: boolean): string;
export declare function toPlainString(errorTemplate: ErrorTemplate): string;
export declare function toHtml(errorTemplate: ErrorTemplate, theme: Theme.Theme, noColor: boolean): {
    title: string;
    location: ErrorLocation | undefined;
    htmlContent: string;
};
export declare function readElmWatchJsonAsJson(elmWatchJsonPath: ElmWatchJsonPath, error: Error): ErrorTemplate;
export declare function decodeElmWatchJson(elmWatchJsonPath: ElmWatchJsonPath, error: JsonError): ErrorTemplate;
export declare function elmWatchJsonNotFound(cwd: Cwd, args: Array<CliArg>): ErrorTemplate;
export declare function debugOptimizeForHot(): ErrorTemplate;
export declare function debugOptimizeClash(): ErrorTemplate;
export declare function unknownFlags(cwd: Cwd, elmWatchJsonPath: ElmWatchJsonPath, runMode: RunMode, args: Array<CliArg>, theUnknownFlags: NonEmptyArray<CliArg>): ErrorTemplate;
export declare function unknownTargetsSubstrings(elmWatchJsonPath: ElmWatchJsonPath, knownTargets: NonEmptyArray<string>, theUnknownTargetsSubstrings: NonEmptyArray<string>): ErrorTemplate;
export declare function noCommonRoot(paths: NonEmptyArray<AbsolutePath>): ErrorTemplate;
export declare function elmJsonNotFound(outputPath: OutputPath, inputs: NonEmptyArray<InputPath>, foundElmJsonPaths: Array<{
    inputPath: InputPath;
    elmJsonPath: ElmJsonPath;
}>): ErrorTemplate;
export declare function nonUniqueElmJsonPaths(outputPath: OutputPath, theNonUniqueElmJsonPaths: NonEmptyArray<{
    inputPath: InputPath;
    elmJsonPath: ElmJsonPath;
}>): ErrorTemplate;
export declare function inputsNotFound(outputPath: OutputPath, inputs: NonEmptyArray<UncheckedInputPath>): ErrorTemplate;
export declare function inputsFailedToResolve(outputPath: OutputPath, inputs: NonEmptyArray<{
    inputPath: UncheckedInputPath;
    error: Error;
}>): ErrorTemplate;
export declare function duplicateInputs(outputPath: OutputPath, duplicates: NonEmptyArray<{
    inputs: NonEmptyArray<InputPath>;
    resolved: AbsolutePath;
}>): ErrorTemplate;
export declare function duplicateOutputs(elmWatchJsonPath: ElmWatchJsonPath, duplicates: NonEmptyArray<{
    originalOutputPathStrings: NonEmptyArray<string>;
    absolutePath: AbsolutePath;
}>): ErrorTemplate;
export declare function elmNotFoundError(location: ElmJsonPath | OutputPath, command: Command): ErrorTemplate;
export declare function commandNotFoundError(outputPath: OutputPath, command: Command): ErrorTemplate;
export declare function otherSpawnError(location: ElmJsonPath | OutputPath, error: Error, command: Command): ErrorTemplate;
export declare function unexpectedElmMakeOutput(outputPath: OutputPath, exitReason: ExitReason, stdout: string, stderr: string, command: Command): ErrorTemplate;
export declare function unexpectedElmInstallOutput(elmJsonPath: ElmJsonPath, exitReason: ExitReason, stdout: string, stderr: string, command: Command): ErrorTemplate;
export declare function postprocessStdinWriteError(location: ElmJsonPath | OutputPath, error: Error, command: Command): ErrorTemplate;
export declare function postprocessNonZeroExit(outputPath: OutputPath, exitReason: ExitReason, stdout: string, stderr: string, command: Command): ErrorTemplate;
export declare function elmWatchNodeMissingScript(elmWatchJsonPath: ElmWatchJsonPath): ErrorTemplate;
export declare function elmWatchNodeImportError(scriptPath: ElmWatchNodeScriptPath, error: UnknownValueAsString, stdout: string, stderr: string): ErrorTemplate;
export declare function elmWatchNodeDefaultExportNotFunction(scriptPath: ElmWatchNodeScriptPath, imported: UnknownValueAsString, typeofDefault: string, stdout: string, stderr: string): ErrorTemplate;
export declare function elmWatchNodeRunError(scriptPath: ElmWatchNodeScriptPath, args: ElmWatchNodePublicArgs, error: UnknownValueAsString, stdout: string, stderr: string): ErrorTemplate;
export declare function elmWatchNodeBadReturnValue(scriptPath: ElmWatchNodeScriptPath, args: ElmWatchNodePublicArgs, returnValue: UnknownValueAsString, stdout: string, stderr: string): ErrorTemplate;
export type ElmMakeCrashBeforeError = {
    tag: "Json";
    length: number;
} | {
    tag: "Text";
    text: string;
};
export declare function elmMakeCrashError(outputPath: OutputPath | {
    tag: "NoLocation";
}, beforeError: ElmMakeCrashBeforeError, error: string, command: Command): ErrorTemplate;
export declare function elmMakeJsonParseError(outputPath: OutputPath | {
    tag: "NoLocation";
}, error: JsonError, errorFilePath: ErrorFilePath, command: Command): ErrorTemplate;
export declare function elmMakeGeneralError(outputPath: OutputPath, elmJsonPath: ElmJsonPath, error: ElmMakeError.GeneralError, extraError: string | undefined): ErrorTemplate;
export declare function elmMakeProblem(filePath: AbsolutePath, problem: ElmMakeError.Problem, extraError: string | undefined): ErrorTemplate;
export declare function stuckInProgressState(outputPath: OutputPath, state: string): ErrorTemplate;
export declare function creatingDummyFailed(elmJsonPath: ElmJsonPath, error: Error): ErrorTemplate;
export declare function elmInstallError(elmJsonPath: ElmJsonPath, title: string, message: string): ErrorTemplate;
export declare function readElmJsonAsJson(elmJsonPath: ElmJsonPath, error: Error): ErrorTemplate;
export declare function decodeElmJson(elmJsonPath: ElmJsonPath, error: JsonError): ErrorTemplate;
export declare function readElmWatchStuffJsonAsJson(elmWatchStuffJsonPath: ElmWatchStuffJsonPath, error: Error): ErrorTemplate;
export declare function decodeElmWatchStuffJson(elmWatchStuffJsonPath: ElmWatchStuffJsonPath, error: JsonError): ErrorTemplate;
export declare function elmWatchStuffJsonWriteError(elmWatchStuffJsonPath: ElmWatchStuffJsonPath, error: Error): ErrorTemplate;
export declare function importWalkerFileSystemError(outputPath: OutputPath, error: Error): ErrorTemplate;
export declare function needsToWriteProxyFileReadError(outputPath: OutputPath, error: Error, triedPath: AbsolutePath): ErrorTemplate;
export declare function readOutputError(outputPath: OutputPath, error: Error, triedPath: AbsolutePath): ErrorTemplate;
export declare function writeOutputError(outputPath: OutputPath, error: Error, reasonForWriting: WriteOutputErrorReasonForWriting): ErrorTemplate;
export declare function writeProxyOutputError(outputPath: OutputPath, error: Error): ErrorTemplate;
export declare function portConflictForNoPort(error: Error): ErrorTemplate;
export declare function portConflictForPersistedPort(elmWatchStuffJsonPath: ElmWatchStuffJsonPath, port: Port): ErrorTemplate;
export declare function portConflictForPortFromConfig(elmWatchJsonPath: ElmWatchJsonPath, port: Port): ErrorTemplate;
export declare function watcherError(error: Error): ErrorTemplate;
export declare function webSocketBadUrl(expectedStart: string, actualUrlString: string): string;
export declare function webSocketParamsDecodeError(error: JsonError, actualUrlString: string): string;
export declare function webSocketWrongVersion(expectedVersion: string, actualVersion: string): string;
export declare function webSocketTargetNotFound(targetName: string, enabledOutputs: Array<OutputPath>, disabledOutputs: Array<OutputPath>): string;
export declare function webSocketTargetDisabled(targetName: string, enabledOutputs: Array<OutputPath>, disabledOutputs: Array<OutputPath>): string;
export declare function webSocketDecodeError(error: JsonError): string;
export declare function openEditorCommandFailed({ error, command, cwd, timeout, env, stdout, stderr, }: {
    error: ExecException;
    command: string;
    cwd: AbsolutePath;
    timeout: number;
    env: Env;
    stdout: string;
    stderr: string;
}): string;
export declare function printPATH(env: Env, isWindows: boolean): Template;
export declare function printStdio(stdout: string, stderr: string): Template;
export type ErrorFilePath = AbsolutePath | {
    tag: "ErrorFileBadContent";
    content: string;
} | {
    tag: "WritingErrorFileFailed";
    error: Error;
    attemptedPath: AbsolutePath;
};
export declare function tryWriteErrorFile({ cwd, name, content, hash, }: {
    cwd: AbsolutePath;
    name: string;
    content: string;
    hash: string;
}): ErrorFilePath;
export {};
