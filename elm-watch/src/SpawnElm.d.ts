import { ElmMakeError } from "./ElmMakeError";
import { Env } from "./Env";
import * as Errors from "./Errors";
import { JsonError } from "./Helpers";
import { NonEmptyArray } from "./NonEmptyArray";
import { Command, ExitReason } from "./Spawn";
import { CompilationMode, ElmJsonPath, GetNow, InputPath, OutputPath } from "./Types";
export type RunElmMakeResult = RunElmMakeError | {
    tag: "Killed";
} | {
    tag: "Success";
};
export type RunElmMakeError = {
    tag: "ElmMakeCrashError";
    beforeError: Errors.ElmMakeCrashBeforeError;
    error: string;
    command: Command;
} | {
    tag: "ElmMakeError";
    error: ElmMakeError;
    extraError: string | undefined;
} | {
    tag: "ElmMakeJsonParseError";
    error: JsonError;
    errorFilePath: Errors.ErrorFilePath;
    command: Command;
} | {
    tag: "ElmNotFoundError";
    command: Command;
} | {
    tag: "OtherSpawnError";
    error: Error;
    command: Command;
} | {
    tag: "UnexpectedElmMakeOutput";
    exitReason: ExitReason;
    stdout: string;
    stderr: string;
    command: Command;
};
type NullOutputPath = {
    tag: "NullOutputPath";
};
export declare function make({ elmJsonPath, compilationMode, inputs, outputPath, env, getNow, }: {
    elmJsonPath: ElmJsonPath;
    compilationMode: CompilationMode;
    inputs: NonEmptyArray<InputPath>;
    outputPath: NullOutputPath | (OutputPath & {
        writeToTemporaryDir: boolean;
    });
    env: Env;
    getNow: GetNow;
}): {
    promise: Promise<RunElmMakeResult>;
    kill: (options: {
        force: boolean;
    }) => void;
};
export declare function compilationModeToArg(compilationMode: CompilationMode): string | undefined;
type ElmInstallResult = {
    tag: "CreatingDummyFailed";
    error: Error;
} | {
    tag: "ElmInstallError";
    title: string;
    message: string;
} | {
    tag: "ElmNotFoundError";
    command: Command;
} | {
    tag: "Killed";
} | {
    tag: "OtherSpawnError";
    error: Error;
    command: Command;
} | {
    tag: "Success";
    elmInstallOutput: string;
} | {
    tag: "UnexpectedElmInstallOutput";
    exitReason: ExitReason;
    stdout: string;
    stderr: string;
    command: Command;
} | {
    tag: "ElmJsonError";
} | {
    tag: "ElmStuffError";
};
export declare function install({ elmJsonPath, env, getNow, }: {
    elmJsonPath: ElmJsonPath;
    env: Env;
    getNow: GetNow;
}): {
    promise: Promise<ElmInstallResult>;
    kill: (options: {
        force: boolean;
    }) => void;
};
export {};
