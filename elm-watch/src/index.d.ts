import { Env } from "./Env";
import { ReadStream, WriteStream } from "./Helpers";
import { HotKillManager } from "./Hot";
type Options = {
    cwd: string;
    env: Env;
    stdin: ReadStream;
    stdout: WriteStream;
    stderr: WriteStream;
    logDebug: (message: string) => void;
    hotKillManager?: HotKillManager;
};
export declare function elmWatchCli(args: Array<string>, { cwd: cwdString, env, stdin, stdout, stderr, logDebug, hotKillManager, }: Options): Promise<number>;
export {};
