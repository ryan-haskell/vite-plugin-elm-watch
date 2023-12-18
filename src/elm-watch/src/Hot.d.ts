import type WebSocket from "ws";
import { Env } from "./Env";
import * as Errors from "./Errors";
import type { Logger, LoggerConfig } from "./Logger";
import { PortChoice } from "./Port";
import { PostprocessWorkerPool } from "./Postprocess";
import { Project } from "./Project";
import { AbsolutePath, BrowserUiPosition, CompilationMode, ElmWatchJsonPath, GetNow, OutputPath } from "./Types";
import { WebSocketServer } from "./WebSocketServer";
type WatcherEventName = "added" | "changed" | "removed";
type WatcherEvent = {
    tag: "WatcherEvent";
    date: Date;
    eventName: WatcherEventName;
    file: AbsolutePath;
};
type WebSocketRelatedEvent = {
    tag: "WebSocketChangedBrowserUiPosition";
    date: Date;
    outputPath: OutputPath;
    browserUiPosition: BrowserUiPosition;
} | {
    tag: "WebSocketChangedCompilationMode";
    date: Date;
    outputPath: OutputPath;
    compilationMode: CompilationMode;
} | {
    tag: "WebSocketClosed";
    date: Date;
    outputPath: OutputPath | OutputPathError;
} | {
    tag: "WebSocketConnectedNeedingCompilation";
    date: Date;
    outputPath: OutputPath;
} | {
    tag: "WebSocketConnectedNeedingNoAction";
    date: Date;
    outputPath: OutputPath;
} | {
    tag: "WebSocketConnectedWithErrors";
    date: Date;
} | {
    tag: "WorkersLimitedAfterWebSocketClosed";
    date: Date;
    numTerminatedWorkers: number;
};
export type LatestEvent = WebSocketRelatedEvent | (WatcherEvent & {
    affectsAnyTarget: boolean;
});
type WebSocketConnection = {
    webSocket: WebSocket;
    outputPath: OutputPath | OutputPathError;
    priority: number;
};
type OutputPathError = {
    tag: "OutputPathError";
};
type HotRunResult = {
    tag: "ExitOnHandledFatalError";
    errorTemplate: Errors.ErrorTemplate;
} | {
    tag: "ExitOnIdle";
    reason: "CtrlCPressedOrStdinEnd" | "Other";
} | {
    tag: "Restart";
    restartReasons: Array<LatestEvent>;
    postprocessWorkerPool: PostprocessWorkerPool;
    webSocketState: WebSocketState | undefined;
};
export type WebSocketState = {
    webSocketServer: WebSocketServer;
    webSocketConnections: Array<WebSocketConnection>;
};
export type HotKillManager = {
    kill: (() => Promise<void>) | undefined;
};
export declare function run(env: Env, logger: Logger, getNow: GetNow, restartReasons: Array<LatestEvent>, postprocessWorkerPool: PostprocessWorkerPool, webSocketState: WebSocketState | undefined, project: Project, portChoice: PortChoice, hotKillManager: HotKillManager): Promise<HotRunResult>;
export declare function watchElmWatchJsonOnce(getNow: GetNow, elmWatchJsonPath: ElmWatchJsonPath): Promise<WatcherEvent>;
export declare function printTimeline(loggerConfig: LoggerConfig, events: Array<LatestEvent>): string | undefined;
export {};
