/// <reference types="node" resolution-mode="require"/>
import { Env } from "./Env";
import { NonEmptyArray } from "./NonEmptyArray";
import { ElmWatchNodeInternalArgs, PostprocessResult } from "./PostprocessShared";
import { CompilationMode, ElmWatchJsonPath, OutputPath, RunMode } from "./Types";
export type Postprocess = {
    tag: "NoPostprocess";
} | {
    tag: "Postprocess";
    postprocessArray: NonEmptyArray<string>;
};
export declare function runPostprocess({ env, elmWatchJsonPath, compilationMode, runMode, outputPath: output, postprocessArray, code, postprocessWorkerPool, }: {
    env: Env;
    elmWatchJsonPath: ElmWatchJsonPath;
    compilationMode: CompilationMode;
    runMode: RunMode;
    outputPath: OutputPath;
    postprocessArray: NonEmptyArray<string>;
    postprocessWorkerPool: PostprocessWorkerPool;
    code: Buffer | string;
}): {
    promise: Promise<PostprocessResult>;
    kill: () => Promise<void>;
};
export declare class PostprocessWorkerPool {
    private onUnexpectedError;
    private workers;
    private calculateMax;
    constructor(onUnexpectedError: (error: Error) => void);
    getSize(): number;
    setCalculateMax(calculateMax: () => number): void;
    getOrCreateAvailableWorker(): PostprocessWorker;
    limit(): Promise<number>;
    terminate(): Promise<void>;
}
declare class PostprocessWorker {
    private onUnexpectedError;
    private onIdle;
    private onTerminated;
    private worker;
    private status;
    constructor(onUnexpectedError: (error: Error) => void, onIdle: (worker: PostprocessWorker) => void, onTerminated: (worker: PostprocessWorker) => void);
    private postMessage;
    isIdle(): boolean;
    postprocess(args: ElmWatchNodeInternalArgs): Promise<PostprocessResult>;
    terminate(): Promise<void>;
}
export {};
