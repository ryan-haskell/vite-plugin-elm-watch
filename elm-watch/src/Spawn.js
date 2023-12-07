import * as childProcess from "child_process";
import { IS_WINDOWS } from "./IsWindows.js";
export function spawn(command) {
    let killed = false;
    // istanbul ignore next
    let kill = () => {
        killed = true;
    };
    const promise = (actualSpawn) => new Promise((resolve) => {
        // istanbul ignore if
        if (killed) {
            resolve({ tag: "Killed", command });
            return;
        }
        const child = actualSpawn(command.command, command.args, {
            ...command.options,
            cwd: command.options.cwd.absolutePath,
        });
        const stdout = [];
        const stderr = [];
        child.on("error", (error) => {
            resolve(
                // istanbul ignore next
                error.code === "ENOENT"
                    ? { tag: "CommandNotFoundError", command }
                    : { tag: "OtherSpawnError", error, command });
        });
        let stdinWriteError = undefined;
        child.stdin.on("error", (error) => {
            // EPIPE on Windows and macOS, EOF on Windows.
            // istanbul ignore else
            if (error.code === "EPIPE" ||
                /* istanbul ignore next */ error.code === "EOF") {
                // The postprocess program can exit before we have managed to write all
                // the stdin. The stdin write error happens before the "exit" event.
                // It’s more important to get to know the exit code and stdout/stderr
                // than this stdin error. So give the "exit" event a chance to happen
                // before reporting this one.
                const result = {
                    tag: "StdinWriteError",
                    error,
                    command,
                };
                stdinWriteError = {
                    result,
                    timeoutId: setTimeout(
                        // This is covered on macOS, but not on Linux.
                        // istanbul ignore next
                        () => {
                            resolve(result);
                        }, 500),
                };
            }
            else {
                resolve({ tag: "OtherSpawnError", error, command });
            }
        });
        // istanbul ignore next
        child.stdout.on("error", (error) => {
            resolve({ tag: "OtherSpawnError", error, command });
        });
        // istanbul ignore next
        child.stderr.on("error", (error) => {
            resolve({ tag: "OtherSpawnError", error, command });
        });
        child.stdout.on("data", (chunk) => {
            stdout.push(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderr.push(chunk);
        });
        child.on("exit", (exitCode, signal) => {
            if (killed) {
                // Ignore after killed.
            }
            else if (exitCode === 0 && stdinWriteError !== undefined) {
                clearTimeout(stdinWriteError.timeoutId);
                resolve(stdinWriteError.result);
            }
            else {
                resolve({
                    tag: "Exit",
                    exitReason: exitReason(exitCode, signal),
                    stdout: Buffer.concat(stdout),
                    stderr: Buffer.concat(stderr),
                    command,
                });
            }
        });
        kill = () => {
            // istanbul ignore else
            if (!killed) {
                child.kill();
                resolve({ tag: "Killed", command });
                killed = true;
            }
        };
        if (command.stdin !== undefined) {
            child.stdin.end(command.stdin);
        }
    });
    // istanbul ignore next
    return {
        promise: IS_WINDOWS
            ? import("cross-spawn").then((crossSpawn) => promise(crossSpawn.spawn))
            : promise(childProcess.spawn),
        kill: () => {
            kill();
        },
    };
}
function exitReason(exitCode, signal) {
    // istanbul ignore next
    return exitCode !== null
        ? { tag: "ExitCode", exitCode }
        : signal !== null
            ? { tag: "Signal", signal }
            : { tag: "Unknown" };
}
