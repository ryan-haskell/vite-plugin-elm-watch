/// <reference types="node" resolution-mode="require"/>
import * as readline from "readline";
import { Env } from "./Env";
import * as Errors from "./Errors";
import { ReadStream, WriteStream } from "./Helpers";
import { GetNow } from "./Types";
export declare const DEFAULT_COLUMNS = 80;
export type Logger = {
    config: LoggerConfig;
    write: (message: string) => void;
    writeToStderrMakesALotOfSenseHere: (message: string) => void;
    errorTemplate: (template: Errors.ErrorTemplate) => void;
    debug: typeof console.debug;
    clearScreen: () => void;
    clearScreenDown: () => void;
    clearLine: (dir: readline.Direction) => void;
    moveCursor: (dx: number, dy: number) => void;
    setRawMode: (onExit: () => void) => void;
    reset: () => void;
    queryTerminal: (escapes: string, isDone: (stdin: string) => boolean) => Promise<string | undefined>;
};
export type LoggerConfig = {
    debug: boolean;
    noColor: boolean;
    fancy: boolean;
    isTTY: boolean;
    mockedTimings: boolean;
    columns: number;
};
export declare function makeLogger({ env, getNow, stdin, stdout, stderr, logDebug, }: {
    env: Env;
    getNow: GetNow;
    stdin: ReadStream;
    stdout: WriteStream;
    stderr: WriteStream;
    logDebug: (message: string) => void;
}): Logger;
