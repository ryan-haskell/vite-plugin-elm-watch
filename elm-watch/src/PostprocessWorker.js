import * as path from "path";
import { repr } from "tiny-decoders";
import * as url from "url";
import { parentPort } from "worker_threads";
import { unknownErrorToString } from "./Helpers";
import { isNonEmptyArray } from "./NonEmptyArray";
import { ELM_WATCH_NODE, } from "./PostprocessShared";
// Many errors are typed to always have `stdout` and `stderr`. They are captured
// from the worker in `Postprocess.ts`, not here, though. By including this
// empty stdio we can still use the same type. A bit weird, but it works.
const emptyStdio = {
    stdout: "",
    stderr: "",
};
function main(port) {
    port.on("messageerror", (error) => {
        throw error;
    });
    port.on("message", (message) => {
        switch (message.tag) {
            case "StartPostprocess":
                elmWatchNode(message.args)
                    .then((result) => {
                    port.postMessage({
                        tag: "PostprocessDone",
                        result: { tag: "Resolve", value: result },
                    });
                })
                    .catch((error) => {
                    port.postMessage({
                        tag: "PostprocessDone",
                        result: { tag: "Reject", error },
                    });
                });
                break;
        }
    });
}
async function elmWatchNode({ cwd, code, targetName, compilationMode, runMode, userArgs, }) {
    if (!isNonEmptyArray(userArgs)) {
        return { tag: "ElmWatchNodeMissingScript" };
    }
    const scriptPath = {
        tag: "ElmWatchNodeScriptPath",
        theElmWatchNodeScriptFileUrl: url
            .pathToFileURL(path.resolve(cwd.absolutePath, userArgs[0]))
            .toString(),
    };
    let imported;
    try {
        imported = (await import(scriptPath.theElmWatchNodeScriptFileUrl));
    }
    catch (unknownError) {
        return {
            tag: "ElmWatchNodeImportError",
            scriptPath,
            error: unknownValueAsString(unknownError, importErrorToString),
            ...emptyStdio,
        };
    }
    if (typeof imported.default !== "function") {
        return {
            tag: "ElmWatchNodeDefaultExportNotFunction",
            scriptPath,
            imported: unknownValueAsString(
            // To/from entries is needed. Otherwise `repr` prints `"Module"`.
            Object.fromEntries(Object.entries(imported)), (value) => repr(value, { maxObjectChildren: 10 })),
            typeofDefault: typeof imported.default,
            ...emptyStdio,
        };
    }
    const args = {
        code,
        targetName,
        compilationMode,
        runMode,
        // Mimic `process.argv`: ["node", "/absolute/path/to/script", "arg1", "arg2", "..."].
        argv: [
            ELM_WATCH_NODE,
            url.fileURLToPath(scriptPath.theElmWatchNodeScriptFileUrl),
            ...userArgs.slice(1),
        ],
    };
    let returnValue;
    try {
        returnValue = (await imported.default(args));
    }
    catch (unknownError) {
        return {
            tag: "ElmWatchNodeRunError",
            scriptPath,
            args,
            error: unknownValueAsString(unknownError, unknownErrorToString),
            ...emptyStdio,
        };
    }
    if (typeof returnValue !== "string") {
        return {
            tag: "ElmWatchNodeBadReturnValue",
            scriptPath,
            args,
            returnValue: unknownValueAsString(returnValue, repr),
            ...emptyStdio,
        };
    }
    return { tag: "Success", code: returnValue };
}
function unknownValueAsString(value, toString) {
    return {
        tag: "UnknownValueAsString",
        value: toString(value),
    };
}
function importErrorToString(error) {
    const code = error?.code;
    // `import()` is used for real (since it supports both CJS and MJS).
    // In Jest tests it seems to be impossible to use `import()` so we have to
    // support `require()` too.
    return code === "ERR_MODULE_NOT_FOUND" || // `import()`
        code === "MODULE_NOT_FOUND" // `require()`
        ? error.message
        : unknownErrorToString(error);
}
if (parentPort === null) {
    throw new Error("PostprocessWorker.ts: worker_threads.parentPort is null!");
}
main(parentPort);
