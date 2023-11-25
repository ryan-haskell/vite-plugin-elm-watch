import * as path from "path";
import { Worker } from "worker_threads";
import { toError } from "./Helpers";
import { absoluteDirname } from "./PathHelpers";
import { ELM_WATCH_NODE, } from "./PostprocessShared";
import { spawn } from "./Spawn";
export function runPostprocess({ env, elmWatchJsonPath, compilationMode, runMode, outputPath: output, postprocessArray, code, postprocessWorkerPool, }) {
    const commandName = postprocessArray[0];
    const userArgs = postprocessArray.slice(1);
    const cwd = absoluteDirname(elmWatchJsonPath.theElmWatchJsonPath);
    if (commandName === ELM_WATCH_NODE) {
        const worker = postprocessWorkerPool.getOrCreateAvailableWorker();
        return {
            promise: worker.postprocess({
                cwd,
                code: code.toString("utf8"),
                targetName: output.targetName,
                compilationMode,
                runMode,
                userArgs,
            }),
            kill: () => worker.terminate(),
        };
    }
    const command = {
        command: commandName,
        args: [...userArgs, output.targetName, compilationMode, runMode],
        options: { cwd, env },
        stdin: code,
    };
    const { promise, kill } = spawn(command);
    const handleSpawnResult = (spawnResult) => {
        switch (spawnResult.tag) {
            case "CommandNotFoundError":
            case "OtherSpawnError":
                return spawnResult;
            case "StdinWriteError":
                return {
                    tag: "PostprocessStdinWriteError",
                    error: spawnResult.error,
                    command: spawnResult.command,
                };
            case "Killed":
                return { tag: "Killed" };
            case "Exit": {
                const { exitReason } = spawnResult;
                if (!(exitReason.tag === "ExitCode" && exitReason.exitCode === 0)) {
                    const stdout = spawnResult.stdout.toString("utf8");
                    const stderr = spawnResult.stderr.toString("utf8");
                    return {
                        tag: "PostprocessNonZeroExit",
                        exitReason,
                        stdout,
                        stderr,
                        command,
                    };
                }
                return { tag: "Success", code: spawnResult.stdout };
            }
        }
    };
    return {
        promise: promise.then(handleSpawnResult),
        kill: () => {
            kill();
            return Promise.resolve();
        },
    };
}
// Keeps track of several `PostprocessWorker`s. Note: `Compile.getOutputActions`
// makes sure that at the most N things (not just workers) are running at the
// same time.
export class PostprocessWorkerPool {
    constructor(onUnexpectedError) {
        this.onUnexpectedError = onUnexpectedError;
        this.workers = new Set();
        this.calculateMax = () => Infinity;
    }
    getSize() {
        return this.workers.size;
    }
    setCalculateMax(calculateMax) {
        this.calculateMax = calculateMax;
    }
    getOrCreateAvailableWorker() {
        const existingWorker = Array.from(this.workers).find((worker) => worker.isIdle());
        if (existingWorker === undefined) {
            const newWorker = new PostprocessWorker(this.onUnexpectedError, () => {
                this.limit().catch(this.onUnexpectedError);
            }, (worker) => {
                this.workers.delete(worker);
            });
            this.workers.add(newWorker);
            return newWorker;
        }
        else {
            return existingWorker;
        }
    }
    async limit() {
        const idle = Array.from(this.workers).filter((worker) => worker.isIdle());
        const toKill = this.workers.size - this.calculateMax();
        if (toKill > 0) {
            await Promise.all(idle.slice(-toKill).map((worker) => worker.terminate()));
        }
        return toKill;
    }
    async terminate() {
        await Promise.all(Array.from(this.workers).map((worker) => worker.terminate()));
    }
}
class PostprocessWorker {
    constructor(onUnexpectedError, onIdle, onTerminated) {
        this.onUnexpectedError = onUnexpectedError;
        this.onIdle = onIdle;
        this.onTerminated = onTerminated;
        this.worker = new Worker(path.join(__dirname, "PostprocessWorker.js"), {
            stdout: true,
            stderr: true,
        });
        this.status = { tag: "Idle" };
        const stdout = [];
        const stderr = [];
        this.worker.stdout.on("data", (chunk) => {
            stdout.push(chunk);
        });
        this.worker.stderr.on("data", (chunk) => {
            stderr.push(chunk);
        });
        // istanbul ignore next
        this.worker.on("error", (error) => {
            if (this.status.tag !== "Terminated") {
                this.status = { tag: "Terminated" };
                this.onTerminated(this);
                this.onUnexpectedError(error);
            }
        });
        // istanbul ignore next
        this.worker.on("messageerror", (error) => {
            if (this.status.tag !== "Terminated") {
                this.status = { tag: "Terminated" };
                this.onTerminated(this);
                this.onUnexpectedError(error);
            }
        });
        this.worker.on("exit", (exitCode) => {
            // istanbul ignore if
            if (this.status.tag !== "Terminated") {
                this.status = { tag: "Terminated" };
                this.onTerminated(this);
                this.onUnexpectedError(new Error(`PostprocessWorker unexpectedly exited, with exit code ${exitCode}.`));
            }
        });
        this.worker.on("message", (message) => {
            switch (message.tag) {
                case "PostprocessDone":
                    switch (this.status.tag) {
                        // istanbul ignore next
                        case "Idle":
                            this.terminate().catch(this.onUnexpectedError);
                            this.onUnexpectedError(new Error(`PostprocessWorker received a ${JSON.stringify(message.tag)} message from the worker. This should only happen when "Busy" but the status is "Idle".`));
                            break;
                        case "Busy":
                            switch (message.result.tag) {
                                case "Resolve": {
                                    const result = message.result.value;
                                    this.status.resolve("stdout" in result
                                        ? {
                                            ...result,
                                            stdout: Buffer.concat(stdout).toString("utf8"),
                                            stderr: Buffer.concat(stderr).toString("utf8"),
                                        }
                                        : result);
                                    break;
                                }
                                // istanbul ignore next
                                case "Reject":
                                    this.status.reject(toError(message.result.error));
                                    break;
                            }
                            this.status = { tag: "Idle" };
                            this.onIdle(this);
                            break;
                        // istanbul ignore next
                        case "Terminated":
                            break;
                    }
                    stdout.length = 0;
                    stderr.length = 0;
            }
        });
    }
    postMessage(message) {
        this.worker.postMessage(message);
    }
    isIdle() {
        return this.status.tag === "Idle";
    }
    async postprocess(args) {
        switch (this.status.tag) {
            case "Idle":
                return new Promise((resolve, reject) => {
                    this.status = { tag: "Busy", resolve, reject };
                    this.postMessage({ tag: "StartPostprocess", args });
                });
            // istanbul ignore next
            case "Busy":
            // istanbul ignore next
            case "Terminated":
                throw new Error(`Cannot call PostprocessWorker#postprocess because \`this.status === ${JSON.stringify(this.status)}\` instead of the expected "Idle".`);
        }
    }
    async terminate() {
        switch (this.status.tag) {
            case "Idle":
                this.status = { tag: "Terminated" };
                this.onTerminated(this);
                await this.worker.terminate();
                break;
            case "Busy": {
                const { resolve } = this.status;
                this.status = { tag: "Terminated" };
                this.onTerminated(this);
                await this.worker.terminate();
                resolve({ tag: "Killed" });
                break;
            }
            // istanbul ignore next
            case "Terminated":
            // Do nothing.
        }
    }
}
