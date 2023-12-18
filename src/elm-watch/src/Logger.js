import * as readline from "readline";
import * as util from "util";
import { __ELM_WATCH_DEBUG, __ELM_WATCH_MOCKED_TIMINGS, __ELM_WATCH_NOT_TTY, __ELM_WATCH_QUERY_TERMINAL_MAX_AGE_MS, __ELM_WATCH_QUERY_TERMINAL_TIMEOUT_MS, ELM_WATCH_EXIT_ON_STDIN_END, NO_COLOR, WT_SESSION, } from "./Env.js"
import * as Errors from "./Errors.js"
import { bold, CLEAR, join, removeColor, silentlyReadIntEnvValue, } from "./Helpers.js"
import { IS_WINDOWS } from "./IsWindows.js"
export const DEFAULT_COLUMNS = 80;
export function makeLogger({ env, getNow, stdin, stdout, stderr, logDebug, }) {
    const noColor = NO_COLOR in env;
    const handleColor = (string) => noColor ? removeColor(string) : string;
    let queryTerminalStatus = { tag: "NotQueried" };
    // istanbul ignore next
    const defaultOnExit = () => {
        // Do nothing.
    };
    let onExit = defaultOnExit;
    const exitOnCtrlC = (data) => {
        if (data.toString("utf8") === "\x03") {
            // ctrl+c was pressed.
            onExit();
        }
    };
    const exitOnStdinEnd = () => {
        // `onExit` is mutated over time, so don’t do `stdin.on("close", onExit)`.
        onExit();
    };
    // In my testing, getting the responses take about 1 ms on macOS (both the
    // default Terminal and iTerm), and about 10 ms on Gnome Terminal. 100 ms
    // should be plenty, while still not being _too_ slow on terminals that
    // don’t support querying colors.
    const queryTerminalTimeoutMs = silentlyReadIntEnvValue(env[__ELM_WATCH_QUERY_TERMINAL_TIMEOUT_MS], 100);
    const queryTerminalMaxAgeMs = silentlyReadIntEnvValue(env[__ELM_WATCH_QUERY_TERMINAL_MAX_AGE_MS], 1000);
    const config = {
        debug: __ELM_WATCH_DEBUG in env,
        noColor,
        fancy:
            // istanbul ignore next
            (!IS_WINDOWS || WT_SESSION in env) && !noColor,
        isTTY: __ELM_WATCH_NOT_TTY in env
            ? /* istanbul ignore next */ false
            : stdout.isTTY,
        mockedTimings: __ELM_WATCH_MOCKED_TIMINGS in env,
        get columns() {
            // `.columns` is `undefined` if not a TTY.
            // This is a getter because it can change over time, if the user resizes
            // the terminal.
            // istanbul ignore next
            return stdout.columns ?? DEFAULT_COLUMNS;
        },
    };
    if (ELM_WATCH_EXIT_ON_STDIN_END in env) {
        stdin.on("end", exitOnStdinEnd);
        stdin.resume();
    }
    return {
        write(message) {
            stdout.write(`${handleColor(message)}\n`);
        },
        writeToStderrMakesALotOfSenseHere(message) {
            stderr.write(`${handleColor(message)}\n`);
        },
        errorTemplate(template) {
            stdout.write(`${Errors.toTerminalString(template, config.columns, noColor)}\n`);
        },
        // istanbul ignore next
        debug(...args) {
            if (config.debug) {
                logDebug(join(args.map((arg, index) => index === 0 && typeof arg === "string" && !noColor
                    ? bold(arg)
                    : util.inspect(arg, {
                        depth: Infinity,
                        colors: !noColor,
                        maxStringLength: 1000,
                    })), "\n"));
            }
        },
        clearScreen() {
            if (config.isTTY) {
                stdout.write(CLEAR);
            }
        },
        clearScreenDown() {
            if (config.isTTY) {
                readline.clearScreenDown(stdout);
            }
        },
        clearLine(dir) {
            if (config.isTTY) {
                readline.clearLine(stdout, dir);
            }
        },
        moveCursor(dx, dy) {
            if (config.isTTY) {
                readline.moveCursor(stdout, dx, dy);
            }
        },
        setRawMode(passedOnExit) {
            onExit = passedOnExit;
            if (stdin.isTTY && stdout.isTTY && !stdin.isRaw) {
                stdin.setRawMode(true);
                stdin.on("data", exitOnCtrlC);
                stdin.resume();
            }
        },
        reset() {
            onExit = defaultOnExit;
            queryTerminalStatus = { tag: "NotQueried" };
            stdin.pause();
            stdin.off("data", exitOnCtrlC);
            stdin.off("end", exitOnStdinEnd);
            if (stdin.isRaw) {
                stdin.setRawMode(false);
            }
        },
        async queryTerminal(escapes, isDone) {
            if (!stdin.isRaw) {
                return undefined;
            }
            const run = async () => {
                const callbacks = [];
                queryTerminalStatus = { tag: "Querying", callbacks };
                const result = await queryTerminalHelper(queryTerminalTimeoutMs, stdin, stdout, escapes, isDone);
                queryTerminalStatus = {
                    tag: "Queried",
                    stdin: result,
                    date: getNow(),
                };
                for (const callback of callbacks) {
                    callback(result);
                }
                return result;
            };
            switch (queryTerminalStatus.tag) {
                case "NotQueried":
                    return run();
                case "Querying": {
                    const { callbacks } = queryTerminalStatus;
                    return new Promise((resolve) => {
                        callbacks.push(resolve);
                    });
                }
                case "Queried":
                    return getNow().getTime() - queryTerminalStatus.date.getTime() <=
                        queryTerminalMaxAgeMs
                        ? queryTerminalStatus.stdin
                        : run();
            }
        },
        config,
    };
}
async function queryTerminalHelper(queryTerminalTimeoutMs, stdin, stdout, escapes, isDone) {
    return new Promise((resolve) => {
        let stdinString = "";
        const onStdin = (data) => {
            stdinString += data.toString("utf8");
            if (isDone(stdinString)) {
                clearTimeout(timeoutId);
                stdin.off("data", onStdin);
                resolve(stdinString);
            }
        };
        stdin.on("data", onStdin);
        stdout.write(escapes);
        const timeoutId = setTimeout(() => {
            stdin.off("data", onStdin);
            resolve(undefined);
        }, queryTerminalTimeoutMs);
    });
}
