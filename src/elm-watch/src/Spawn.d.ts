/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { Env } from "./Env";
import { AbsolutePath } from "./Types";
export type SpawnResult = {
    tag: "CommandNotFoundError";
    command: Command;
} | {
    tag: "Exit";
    exitReason: ExitReason;
    stdout: Buffer;
    stderr: Buffer;
    command: Command;
} | {
    tag: "Killed";
    command: Command;
} | {
    tag: "OtherSpawnError";
    error: Error;
    command: Command;
} | {
    tag: "StdinWriteError";
    error: Error;
    command: Command;
};
export type Command = {
    command: string;
    args: Array<string>;
    options: {
        cwd: AbsolutePath;
        env: Env;
    };
    stdin?: Buffer | string;
};
export declare function spawn(command: Command): {
    promise: Promise<SpawnResult>;
    kill: () => void;
};
export type ExitReason = {
    tag: "ExitCode";
    exitCode: number;
} | {
    tag: "Signal";
    signal: NodeJS.Signals;
} | {
    tag: "Unknown";
};
