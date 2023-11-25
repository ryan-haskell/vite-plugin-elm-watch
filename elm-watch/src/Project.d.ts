/// <reference types="node" resolution-mode="require"/>
import * as ElmJson from "./ElmJson";
import * as ElmWatchJson from "./ElmWatchJson";
import { ElmWatchStuffJson } from "./ElmWatchStuffJson";
import { Env } from "./Env";
import { HashMap } from "./HashMap";
import { HashSet } from "./HashSet";
import { WalkImportsError } from "./ImportWalker";
import { NonEmptyArray } from "./NonEmptyArray";
import { Postprocess } from "./Postprocess";
import { PostprocessError } from "./PostprocessShared";
import { RunElmMakeError } from "./SpawnElm";
import type { AbsolutePath, BrowserUiPosition, CompilationMode, ElmJsonPath, ElmWatchJsonPath, ElmWatchStuffDir, ElmWatchStuffJsonPath, GetNow, InputPath, OutputPath, UncheckedInputPath, WriteOutputErrorReasonForWriting } from "./Types";
export type Project = {
    watchRoot: AbsolutePath;
    elmWatchJsonPath: ElmWatchJsonPath;
    elmWatchStuffJsonPath: ElmWatchStuffJsonPath;
    disabledOutputs: HashSet<OutputPath>;
    elmJsonsErrors: Array<ElmJsonErrorWithMetadata>;
    elmJsons: HashMap<ElmJsonPath, HashMap<OutputPath, OutputState>>;
    maxParallel: number;
    postprocess: Postprocess;
};
export declare class OutputState {
    private getNow;
    readonly inputs: NonEmptyArray<InputPath>;
    private _status;
    private _durations;
    private _lastStartTimestamp;
    compilationMode: CompilationMode;
    browserUiPosition: BrowserUiPosition;
    openErrorOverlay: boolean;
    allRelatedElmFilePaths: Set<string>;
    recordFields: Set<string> | undefined;
    dirty: boolean;
    constructor(inputs: NonEmptyArray<InputPath>, compilationMode: CompilationMode, browserUiPosition: BrowserUiPosition, openErrorOverlay: boolean, getNow: GetNow);
    flushDurations(): Array<Duration>;
    get status(): OutputStatus;
    setStatus(status: OutputStatus): void;
}
export type OutputStatus = OutputError | {
    tag: "ElmMake";
    compilationMode: CompilationMode;
    elmDurationMs: number;
    walkerDurationMs: number;
    injectDurationMs: number;
    kill: (options: {
        force: boolean;
    }) => void;
} | {
    tag: "ElmMakeTypecheckOnly";
    elmDurationMs: number;
    walkerDurationMs: number;
    kill: (options: {
        force: boolean;
    }) => void;
} | {
    tag: "Interrupted";
} | {
    tag: "NotWrittenToDisk";
} | {
    tag: "Postprocess";
    kill: () => Promise<void> | void;
} | {
    tag: "QueuedForElmMake";
} | {
    tag: "QueuedForPostprocess";
    postprocessArray: NonEmptyArray<string>;
    code: Buffer | string;
    elmCompiledTimestamp: number;
    recordFields: Set<string> | undefined;
} | {
    tag: "Success";
    elmFileSize: number;
    postprocessFileSize: number;
    elmCompiledTimestamp: number;
};
export type OutputError = ElmJson.ParseError | OutputFsError | PostprocessError | RunElmMakeError | WalkImportsError;
type OutputFsError = {
    tag: "NeedsToWriteProxyFileReadError";
    error: Error;
    triedPath: AbsolutePath;
} | {
    tag: "ReadOutputError";
    error: Error;
    triedPath: AbsolutePath;
} | {
    tag: "WriteOutputError";
    error: Error;
    reasonForWriting: WriteOutputErrorReasonForWriting;
} | {
    tag: "WriteProxyOutputError";
    error: Error;
};
type ElmJsonError = {
    tag: "DuplicateInputs";
    duplicates: NonEmptyArray<{
        inputs: NonEmptyArray<InputPath>;
        resolved: AbsolutePath;
    }>;
} | {
    tag: "ElmJsonNotFound";
    elmJsonNotFound: NonEmptyArray<InputPath>;
    foundElmJsonPaths: Array<{
        inputPath: InputPath;
        elmJsonPath: ElmJsonPath;
    }>;
} | {
    tag: "InputsFailedToResolve";
    inputsFailedToResolve: NonEmptyArray<{
        inputPath: UncheckedInputPath;
        error: Error;
    }>;
} | {
    tag: "InputsNotFound";
    inputsNotFound: NonEmptyArray<UncheckedInputPath>;
} | {
    tag: "NonUniqueElmJsonPaths";
    nonUniqueElmJsonPaths: NonEmptyArray<{
        inputPath: InputPath;
        elmJsonPath: ElmJsonPath;
    }>;
};
export type ElmJsonErrorWithMetadata = {
    outputPath: OutputPath;
    compilationMode: CompilationMode;
    browserUiPosition: BrowserUiPosition;
    openErrorOverlay: boolean;
    error: ElmJsonError;
};
export type Duration = {
    tag: "ElmMake";
    elmDurationMs: number;
    walkerDurationMs: number;
} | {
    tag: "ElmMakeTypecheckOnly";
    elmDurationMs: number;
    walkerDurationMs: number;
} | {
    tag: "Inject";
    durationMs: number;
} | {
    tag: "Postprocess";
    durationMs: number;
} | {
    tag: "QueuedForElmMake";
    durationMs: number;
} | {
    tag: "QueuedForPostprocess";
    durationMs: number;
};
type InitProjectResult = {
    tag: "DuplicateOutputs";
    duplicates: NonEmptyArray<{
        originalOutputPathStrings: NonEmptyArray<string>;
        absolutePath: AbsolutePath;
    }>;
} | {
    tag: "NoCommonRoot";
    paths: NonEmptyArray<AbsolutePath>;
} | {
    tag: "Project";
    project: Project;
};
export declare function initProject({ env, getNow, compilationMode, elmWatchJsonPath, config, enabledTargetsSubstrings, elmWatchStuffDir, elmWatchStuffJsonPath, elmWatchStuffJson, }: {
    env: Env;
    getNow: GetNow;
    compilationMode: CompilationMode;
    elmWatchJsonPath: ElmWatchJsonPath;
    config: ElmWatchJson.Config;
    enabledTargetsSubstrings: NonEmptyArray<string>;
    elmWatchStuffDir: ElmWatchStuffDir;
    elmWatchStuffJsonPath: ElmWatchStuffJsonPath;
    elmWatchStuffJson: ElmWatchStuffJson | undefined;
}): InitProjectResult;
export declare function getFlatOutputs(project: Project): Array<{
    elmJsonPath: ElmJsonPath;
    outputPath: OutputPath;
    outputState: OutputState;
}>;
export declare function projectToDebug(project: Project): unknown;
export {};
