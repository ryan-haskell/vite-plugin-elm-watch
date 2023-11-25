import { Env } from "./Env";
import type { Logger } from "./Logger";
import { PostprocessWorkerPool } from "./Postprocess";
import { Project } from "./Project";
import { GetNow } from "./Types";
type MakeResult = {
    tag: "Error";
} | {
    tag: "Success";
};
export declare function run(env: Env, logger: Logger, getNow: GetNow, project: Project, postprocessWorkerPool: PostprocessWorkerPool): Promise<MakeResult>;
export {};
