/// <reference types="node" resolution-mode="require"/>
import { Env } from "./Env";
import * as Errors from "./Errors";
import { HashMap } from "./HashMap";
import { Logger } from "./Logger";
import { NonEmptyArray } from "./NonEmptyArray";
import { Port } from "./Port";
import { Postprocess, PostprocessWorkerPool } from "./Postprocess";
import { ElmJsonErrorWithMetadata, OutputState, OutputStatus, Project } from "./Project";
import { ElmJsonPath, ElmWatchJsonPath, GetNow, OutputPath, RunMode } from "./Types";
export type InstallDependenciesResult = {
    tag: "Error";
} | {
    tag: "Killed";
} | {
    tag: "Success";
};
export declare function installDependencies(env: Env, logger: Logger, getNow: GetNow, project: Project): {
    promise: Promise<InstallDependenciesResult>;
    kill: (options: {
        force: boolean;
    }) => void;
};
type IndexedOutput = {
    index: number;
    elmJsonPath: ElmJsonPath;
    outputPath: OutputPath;
    outputState: OutputState;
};
type IndexedOutputWithSource = {
    output: IndexedOutput;
    source: "Dirty" | "Queued";
};
type OutputAction = NeedsElmMakeOutputAction | NeedsElmMakeTypecheckOnlyOutputAction | NeedsPostprocessOutputAction | QueueForElmMakeOutputAction;
type NeedsElmMakeOutputAction = IndexedOutputWithSource & {
    tag: "NeedsElmMake";
    elmJsonPath: ElmJsonPath;
    priority: number;
};
type NeedsElmMakeTypecheckOnlyOutputAction = {
    tag: "NeedsElmMakeTypecheckOnly";
    elmJsonPath: ElmJsonPath;
    outputs: NonEmptyArray<IndexedOutputWithSource>;
};
type NeedsPostprocessOutputAction = {
    tag: "NeedsPostprocess";
    output: IndexedOutput;
    postprocessArray: NonEmptyArray<string>;
    priority: number;
    code: Buffer | string;
    elmCompiledTimestamp: number;
    recordFields: Set<string> | undefined;
};
type QueueForElmMakeOutputAction = {
    tag: "QueueForElmMake";
    output: IndexedOutput;
};
export type OutputActions = {
    total: number;
    numExecuting: number;
    numInterrupted: number;
    numErrors: number;
    actions: Array<OutputAction>;
    outputsWithoutAction: Array<IndexedOutput>;
};
export declare function getOutputActions({ project, runMode, includeInterrupted, prioritizedOutputs, }: {
    project: Project;
    runMode: RunMode;
    includeInterrupted: boolean;
    prioritizedOutputs: HashMap<OutputPath, number> | "AllEqualPriority";
}): OutputActions;
export type HandleOutputActionResult = {
    tag: "CompileError";
    elmJsonPath: ElmJsonPath;
    outputPath: OutputPath;
    outputState: OutputState;
} | {
    tag: "FullyCompiledJS";
    outputPath: OutputPath;
    outputState: OutputState;
    code: Buffer | string;
    elmCompiledTimestamp: number;
} | {
    tag: "FullyCompiledJSButRecordFieldsChanged";
    outputPath: OutputPath;
} | {
    tag: "Nothing";
};
type RunModeWithExtraData = {
    tag: "hot";
    webSocketPort: Port;
} | {
    tag: "make";
};
export declare function handleOutputAction({ env, logger, getNow, runMode, elmWatchJsonPath, total, action, postprocess, postprocessWorkerPool, }: {
    env: Env;
    logger: Logger;
    getNow: GetNow;
    runMode: RunModeWithExtraData;
    elmWatchJsonPath: ElmWatchJsonPath;
    total: number;
    action: OutputAction;
    postprocess: Postprocess;
    postprocessWorkerPool: PostprocessWorkerPool;
}): Promise<HandleOutputActionResult>;
export declare function printSpaceForOutputs(logger: Logger, runMode: RunMode, outputActions: OutputActions): void;
export type EmojiName = keyof typeof EMOJI;
export declare const EMOJI: {
    QueuedForElmMake: {
        emoji: string;
        description: string;
    };
    QueuedForPostprocess: {
        emoji: string;
        description: string;
    };
    Busy: {
        emoji: string;
        description: string;
    };
    Error: {
        emoji: string;
        description: string;
    };
    Skipped: {
        emoji: string;
        description: string;
    };
    Success: {
        emoji: string;
        description: string;
    };
    Information: {
        emoji: string;
        description: string;
    };
    Stats: {
        emoji: string;
        description: string;
    };
};
export declare function emojiWidthFix({ emoji, column, isTTY, }: {
    emoji: string;
    column: number;
    isTTY: boolean;
}): string;
export declare const GOOD_ENOUGH_STARTS_WITH_EMOJI_REGEX: RegExp;
export declare function printStatusLinesForElmJsonsErrors(logger: Logger, project: Project): void;
export declare function printErrors(logger: Logger, errors: NonEmptyArray<Errors.ErrorTemplate>): void;
export declare function printNumErrors(logger: Logger, numErrors: number): void;
export declare function printStatusLine({ maxWidth, fancy, isTTY, emojiName, string, }: {
    maxWidth: number;
    fancy: boolean;
    isTTY: boolean;
    emojiName: EmojiName;
    string: string;
}): string;
export declare function extractErrors(project: Project): Array<Errors.ErrorTemplate>;
export declare function renderElmJsonError({ outputPath, error, }: ElmJsonErrorWithMetadata): Errors.ErrorTemplate;
export declare function renderOutputErrors(elmWatchJsonPath: ElmWatchJsonPath, elmJsonPath: ElmJsonPath, outputPath: OutputPath, status: OutputStatus, includeStuckInProgressState?: boolean): Array<Errors.ErrorTemplate>;
export declare function ensureAllRelatedElmFilePaths(elmJsonPath: ElmJsonPath, outputState: OutputState): void;
export {};
