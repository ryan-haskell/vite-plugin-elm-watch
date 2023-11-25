import { Env } from "./Env";
import * as Hot from "./Hot";
import type { Logger } from "./Logger";
import { PostprocessWorkerPool } from "./Postprocess";
import { CliArg, Cwd, GetNow, RunMode } from "./Types";
type RunResult = {
    tag: "Exit";
    exitCode: number;
} | {
    tag: "Restart";
    restartReasons: Array<Hot.LatestEvent>;
    postprocessWorkerPool: PostprocessWorkerPool;
    webSocketState: Hot.WebSocketState | undefined;
};
export declare function run(cwd: Cwd, env: Env, logger: Logger, getNow: GetNow, runMode: RunMode, args: Array<CliArg>, restartReasons: Array<Hot.LatestEvent>, postprocessWorkerPool: PostprocessWorkerPool, webSocketState: Hot.WebSocketState | undefined, hotKillManager: Hot.HotKillManager): Promise<RunResult>;
export {};
