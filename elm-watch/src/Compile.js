import * as fs from "fs";
import * as ElmJson from "./ElmJson";
import { __ELM_WATCH_LOADING_MESSAGE_DELAY } from "./Env";
import * as Errors from "./Errors";
import { HashSet } from "./HashSet";
import { bold, cursorHorizontalAbsolute, dim, join, printDurationMs, printFileSize, silentlyReadIntEnvValue, toError, } from "./Helpers";
import { walkImports, } from "./ImportWalker";
import * as Inject from "./Inject";
import { flattenNonEmptyArray, isNonEmptyArray, mapNonEmptyArray, nonEmptyArrayUniqueBy, } from "./NonEmptyArray";
import { absoluteDirname } from "./PathHelpers";
import { runPostprocess, } from "./Postprocess";
import * as SpawnElm from "./SpawnElm";
// Make sure all dependencies are installed. Otherwise compilation sometimes
// fails when you’ve got multiple outputs for the same elm.json. The error is
// “not enough bytes”/“corrupt file” for `elm-stuff/0.19.1/{d,i,o}.dat`.
// This is done in sequence, in an attempt to avoid:
// - Downloading the same package twice.
// - Two Elm processes writing to `~/.elm` at the same time.
export function installDependencies(env, logger, getNow, project) {
    let currentKill = undefined;
    const loadingMessageDelay = silentlyReadIntEnvValue(env[__ELM_WATCH_LOADING_MESSAGE_DELAY], 100);
    const printStatusLineHelper = (emojiName, message, nonFancy) => printStatusLine({
        maxWidth: logger.config.columns,
        fancy: logger.config.fancy,
        isTTY: logger.config.isTTY,
        emojiName,
        string: logger.config.fancy ? message : `${message}: ${nonFancy}`,
    });
    const continuation = async () => {
        const elmJsonsArray = Array.from(project.elmJsons);
        for (const [index, [elmJsonPath]] of elmJsonsArray.entries()) {
            // Don’t print `(x/y)` the first time, because chances are all packages are
            // downloaded via the first elm.json and that looks nicer.
            const message = `Dependencies${index === 0 ? "" : ` (${index + 1}/${elmJsonsArray.length})`}`;
            const loadingMessage = printStatusLineHelper("Busy", message, "in progress");
            // Avoid printing `loadingMessage` if there’s nothing to download.
            let didWriteLoadingMessage = false;
            const timeoutId = setTimeout(() => {
                logger.write(loadingMessage);
                didWriteLoadingMessage = true;
            }, loadingMessageDelay);
            const clearLoadingMessage = () => {
                if (didWriteLoadingMessage) {
                    logger.moveCursor(0, -1);
                    logger.clearLine(0);
                }
            };
            const onError = (error) => {
                clearLoadingMessage();
                logger.write(printStatusLineHelper("Error", message, "error"));
                logger.write("");
                logger.errorTemplate(error);
                return { tag: "Error" };
            };
            const { promise, kill } = SpawnElm.install({ elmJsonPath, env, getNow });
            currentKill = kill;
            const result = await promise.finally(() => {
                currentKill = undefined;
            });
            clearTimeout(timeoutId);
            switch (result.tag) {
                // If the elm.json is invalid or elm-stuff/ is corrupted we can just
                // ignore that and let the “real” compilation later catch it. This way we
                // get colored error messages.
                case "ElmJsonError":
                case "ElmStuffError":
                    if (didWriteLoadingMessage) {
                        clearLoadingMessage();
                        logger.write(printStatusLineHelper("Skipped", message, "skipped"));
                    }
                    break;
                case "Killed":
                    if (didWriteLoadingMessage) {
                        clearLoadingMessage();
                        logger.write(printStatusLineHelper("Busy", message, "interrupted"));
                    }
                    return { tag: "Killed" };
                case "Success": {
                    const gotOutput = result.elmInstallOutput !== "";
                    if (didWriteLoadingMessage || gotOutput) {
                        clearLoadingMessage();
                        logger.write(printStatusLineHelper("Success", message, "success"));
                    }
                    if (gotOutput) {
                        logger.write(result.elmInstallOutput);
                    }
                    break;
                }
                case "CreatingDummyFailed":
                    return onError(Errors.creatingDummyFailed(elmJsonPath, result.error));
                case "ElmNotFoundError":
                    return onError(Errors.elmNotFoundError(elmJsonPath, result.command));
                // istanbul ignore next
                case "OtherSpawnError":
                    return onError(Errors.otherSpawnError(elmJsonPath, result.error, result.command));
                case "ElmInstallError":
                    return onError(Errors.elmInstallError(elmJsonPath, result.title, result.message));
                case "UnexpectedElmInstallOutput":
                    return onError(Errors.unexpectedElmInstallOutput(elmJsonPath, result.exitReason, result.stdout, result.stderr, result.command));
            }
        }
        return { tag: "Success" };
    };
    return {
        promise: continuation(),
        kill: ({ force }) => {
            if (currentKill !== undefined) {
                currentKill({ force });
            }
        },
    };
}
export function getOutputActions({ project, runMode, includeInterrupted, prioritizedOutputs, }) {
    let index = 0;
    let numExecuting = 0;
    let numInterrupted = 0;
    let numErrors = 0;
    const elmMakeActions = [];
    const elmMakeTypecheckOnlyActions = [];
    const postprocessActions = [];
    const outputsWithoutAction = [];
    const busyElmJsons = new HashSet();
    for (const [elmJsonPath, outputs] of project.elmJsons) {
        const typecheckOnly = [];
        for (const [outputPath, outputState] of outputs) {
            const output = {
                index,
                elmJsonPath,
                outputPath,
                outputState,
            };
            index++;
            const priority = prioritizedOutputs === "AllEqualPriority"
                ? 0
                : prioritizedOutputs.get(outputPath);
            const needsElm = (source) => {
                if (priority !== undefined) {
                    elmMakeActions.push({
                        tag: "NeedsElmMake",
                        elmJsonPath,
                        output,
                        source,
                        priority,
                    });
                }
                else {
                    typecheckOnly.push({ output, source });
                }
            };
            switch (outputState.status.tag) {
                case "ElmMake":
                case "ElmMakeTypecheckOnly":
                    numExecuting++;
                    outputsWithoutAction.push(output);
                    busyElmJsons.add(elmJsonPath);
                    break;
                case "Postprocess":
                    numExecuting++;
                    outputsWithoutAction.push(output);
                    break;
                case "QueuedForElmMake":
                    needsElm("Queued");
                    break;
                case "QueuedForPostprocess":
                    postprocessActions.push({
                        tag: "NeedsPostprocess",
                        output,
                        postprocessArray: outputState.status.postprocessArray,
                        priority: 
                        // istanbul ignore next
                        priority ?? 0,
                        code: outputState.status.code,
                        elmCompiledTimestamp: outputState.status.elmCompiledTimestamp,
                        recordFields: outputState.status.recordFields,
                    });
                    break;
                case "Interrupted":
                    numInterrupted++;
                    if (includeInterrupted) {
                        needsElm("Dirty");
                    }
                    else {
                        outputsWithoutAction.push(output);
                    }
                    break;
                case "Success":
                case "NotWrittenToDisk":
                    if (outputState.dirty) {
                        needsElm("Dirty");
                    }
                    else {
                        outputsWithoutAction.push(output);
                    }
                    break;
                default: {
                    // Make sure only error statuses are left.
                    const _ = outputState.status;
                    void _;
                    numErrors++;
                    if (outputState.dirty) {
                        needsElm("Dirty");
                    }
                    else {
                        outputsWithoutAction.push(output);
                    }
                    break;
                }
            }
        }
        if (isNonEmptyArray(typecheckOnly)) {
            elmMakeTypecheckOnlyActions.push({
                tag: "NeedsElmMakeTypecheckOnly",
                elmJsonPath,
                outputs: typecheckOnly,
            });
        }
    }
    const prioritizedActions = prioritizeActions(runMode, elmMakeActions, elmMakeTypecheckOnlyActions, postprocessActions);
    const actions = [];
    const queueActions = [];
    const threadsLeft = Math.max(0, project.maxParallel - numExecuting);
    for (const action of prioritizedActions) {
        switch (action.tag) {
            case "NeedsElmMake":
                if (actions.length < threadsLeft &&
                    !busyElmJsons.has(action.elmJsonPath)) {
                    busyElmJsons.add(action.elmJsonPath);
                    actions.push(action);
                }
                else {
                    switch (action.source) {
                        case "Dirty":
                            queueActions.push({
                                tag: "QueueForElmMake",
                                output: action.output,
                            });
                            break;
                        case "Queued":
                            outputsWithoutAction.push(action.output);
                            break;
                    }
                }
                break;
            case "NeedsElmMakeTypecheckOnly":
                if (actions.length < threadsLeft &&
                    !busyElmJsons.has(action.elmJsonPath)) {
                    busyElmJsons.add(action.elmJsonPath);
                    actions.push(action);
                }
                else {
                    for (const { output, source } of action.outputs) {
                        switch (source) {
                            case "Dirty":
                                queueActions.push({
                                    tag: "QueueForElmMake",
                                    output,
                                });
                                break;
                            case "Queued":
                                outputsWithoutAction.push(output);
                                break;
                        }
                    }
                }
                break;
            case "NeedsPostprocess":
                if (actions.length < threadsLeft) {
                    actions.push(action);
                }
                else {
                    outputsWithoutAction.push(action.output);
                }
                break;
        }
    }
    return {
        total: index,
        numExecuting,
        numInterrupted,
        numErrors,
        actions: [...actions, ...queueActions],
        outputsWithoutAction,
    };
}
function prioritizeActions(runMode, elmMakeActions, elmMakeTypecheckOnlyActions, postprocessActions) {
    switch (runMode) {
        // In `make` mode, you want to find type errors as quickly as possible (the
        // most likely CI failure). Don’t let slow postprocessing delay that.
        // All outputs have the same priority in `make` mode so don’t bother sorting.
        case "make":
            return [
                ...elmMakeActions,
                ...elmMakeTypecheckOnlyActions,
                ...postprocessActions,
            ];
        // In `hot` mode, try to finish each output as fast as possible, rather than
        // make all of them “evenly slow”.
        case "hot":
            return [
                ...sortByPriority(postprocessActions),
                ...sortByPriority(elmMakeActions),
                ...elmMakeTypecheckOnlyActions,
            ];
    }
}
function sortByPriority(array) {
    return array.slice().sort((a, b) => b.priority - a.priority);
}
export async function handleOutputAction({ env, logger, getNow, runMode, elmWatchJsonPath, total, action, postprocess, postprocessWorkerPool, }) {
    switch (action.tag) {
        case "NeedsElmMake":
            return compileOneOutput({
                env,
                logger,
                getNow,
                runMode,
                total,
                ...action.output,
                postprocess,
            });
        case "NeedsElmMakeTypecheckOnly":
            switch (runMode.tag) {
                // istanbul ignore next
                case "make":
                    throw new Error(`Got NeedsElmMakeTypecheckOnly in \`make\` mode!\n${JSON.stringify(action, null, 2)}`);
                case "hot":
                    await typecheck({
                        env,
                        logger,
                        getNow,
                        runMode: runMode.tag,
                        elmJsonPath: action.elmJsonPath,
                        outputs: mapNonEmptyArray(action.outputs, ({ output }) => output),
                        total,
                        webSocketPort: runMode.webSocketPort,
                    });
                    return { tag: "Nothing" };
            }
        case "NeedsPostprocess":
            return postprocessHelper({
                env,
                logger,
                runMode,
                elmWatchJsonPath,
                total,
                ...action.output,
                postprocessArray: action.postprocessArray,
                postprocessWorkerPool,
                code: action.code,
                elmCompiledTimestamp: action.elmCompiledTimestamp,
                recordFields: action.recordFields,
            });
        case "QueueForElmMake":
            action.output.outputState.setStatus({ tag: "QueuedForElmMake" });
            updateStatusLine({
                logger,
                runMode: runMode.tag,
                total,
                ...action.output,
            });
            return { tag: "Nothing" };
    }
}
async function compileOneOutput({ env, logger, getNow, runMode, elmJsonPath, outputPath, outputState, index, total, postprocess, }) {
    const startTimestamp = getNow().getTime();
    const updateStatusLineHelper = () => {
        updateStatusLine({
            logger,
            runMode: runMode.tag,
            outputPath,
            outputState,
            index,
            total,
        });
    };
    // Watcher events that happen while waiting for `elm make` and
    // postprocessing can flip `dirty` back to `true`.
    outputState.dirty = false;
    const { promise, kill } = SpawnElm.make({
        elmJsonPath,
        compilationMode: outputState.compilationMode,
        inputs: outputState.inputs,
        outputPath: {
            ...outputPath,
            writeToTemporaryDir: !(runMode.tag === "make" && postprocess.tag === "NoPostprocess"),
        },
        env,
        getNow,
    });
    const outputStatus = {
        tag: "ElmMake",
        compilationMode: outputState.compilationMode,
        // These are updated as we go.
        elmDurationMs: -1,
        walkerDurationMs: -1,
        injectDurationMs: -1,
        kill,
    };
    outputState.setStatus(outputStatus);
    updateStatusLineHelper();
    const [elmMakeResult, allRelatedElmFilePathsResult] = await Promise.all([
        promise.then((result) => {
            outputStatus.elmDurationMs = getNow().getTime() - startTimestamp;
            return result;
        }),
        Promise.resolve().then(() => {
            switch (runMode.tag) {
                case "make":
                    return {
                        tag: "Success",
                        allRelatedElmFilePaths: outputState.allRelatedElmFilePaths,
                    };
                case "hot": {
                    // Note: It doesn’t matter if a file changes before we’ve had
                    // chance to compute this the first time (during packages
                    // installation or `elm make` above). Everything is marked as
                    // dirty by default anyway and will get compiled.
                    const result = getAllRelatedElmFilePaths(elmJsonPath, outputState.inputs);
                    outputStatus.walkerDurationMs = getNow().getTime() - startTimestamp;
                    return result;
                }
            }
        }),
    ]);
    if (outputState.dirty || elmMakeResult.tag === "Killed") {
        outputState.setStatus({ tag: "Interrupted" });
        updateStatusLineHelper();
        return { tag: "Nothing" };
    }
    outputState.allRelatedElmFilePaths = allRelatedElmFilePathsWithFallback(allRelatedElmFilePathsResult, outputState);
    const combinedResult = combineResults(elmMakeResult, allRelatedElmFilePathsResult);
    switch (combinedResult.tag) {
        case "elm make success + walker success":
            return onCompileSuccess(logger.config, getNow, updateStatusLineHelper, runMode, elmJsonPath, outputPath, outputState, outputStatus, postprocess);
        case "elm make success + walker failure":
            outputState.setStatus(combinedResult.walkerError);
            updateStatusLineHelper();
            return {
                tag: "CompileError",
                elmJsonPath,
                outputPath,
                outputState,
            };
        case "elm make failure + walker success":
            outputState.setStatus(combinedResult.elmMakeError);
            updateStatusLineHelper();
            return {
                tag: "CompileError",
                elmJsonPath,
                outputPath,
                outputState,
            };
        case "elm make failure + walker failure":
            // If `elm make` failed, don’t bother with `getAllRelatedElmFilePaths` errors.
            outputState.setStatus(combinedResult.elmMakeError);
            updateStatusLineHelper();
            return {
                tag: "CompileError",
                elmJsonPath,
                outputPath,
                outputState,
            };
    }
}
function onCompileSuccess(loggerConfig, getNow, updateStatusLineHelper, runMode, elmJsonPath, outputPath, outputState, outputStatus, postprocess) {
    const elmCompiledTimestamp = getNow().getTime();
    switch (runMode.tag) {
        case "make":
            switch (postprocess.tag) {
                case "NoPostprocess": {
                    let fileSize;
                    try {
                        fileSize = fs.statSync(outputPath.theOutputPath.absolutePath).size;
                    }
                    catch (unknownError) {
                        const error = toError(unknownError);
                        outputState.setStatus({
                            tag: "ReadOutputError",
                            error,
                            triedPath: outputPath.theOutputPath,
                        });
                        updateStatusLineHelper();
                        return {
                            tag: "CompileError",
                            elmJsonPath,
                            outputPath,
                            outputState,
                        };
                    }
                    outputState.setStatus({
                        tag: "Success",
                        elmFileSize: fileSize,
                        postprocessFileSize: fileSize,
                        elmCompiledTimestamp,
                    });
                    updateStatusLineHelper();
                    return { tag: "Nothing" };
                }
                case "Postprocess": {
                    let buffer;
                    try {
                        buffer = fs.readFileSync(outputPath.temporaryOutputPath.absolutePath);
                    }
                    catch (unknownError) {
                        const error = toError(unknownError);
                        outputState.setStatus({
                            tag: "ReadOutputError",
                            error,
                            triedPath: outputPath.temporaryOutputPath,
                        });
                        updateStatusLineHelper();
                        return {
                            tag: "CompileError",
                            elmJsonPath,
                            outputPath,
                            outputState,
                        };
                    }
                    outputState.setStatus({
                        tag: "QueuedForPostprocess",
                        postprocessArray: postprocess.postprocessArray,
                        code: buffer,
                        elmCompiledTimestamp,
                        recordFields: undefined,
                    });
                    updateStatusLineHelper();
                    return { tag: "Nothing" };
                }
            }
        case "hot": {
            let code;
            try {
                code = fs.readFileSync(outputPath.temporaryOutputPath.absolutePath, "utf8");
            }
            catch (unknownError) {
                const error = toError(unknownError);
                outputState.setStatus({
                    tag: "ReadOutputError",
                    error,
                    triedPath: outputPath.temporaryOutputPath,
                });
                updateStatusLineHelper();
                return {
                    tag: "CompileError",
                    elmJsonPath,
                    outputPath,
                    outputState,
                };
            }
            const recordFields = Inject.getRecordFields(outputState.compilationMode, code);
            const newCode = Inject.inject(outputState.compilationMode, code);
            outputStatus.injectDurationMs = getNow().getTime() - elmCompiledTimestamp;
            switch (postprocess.tag) {
                case "NoPostprocess": {
                    try {
                        fs.mkdirSync(absoluteDirname(outputPath.theOutputPath).absolutePath, { recursive: true });
                        fs.writeFileSync(outputPath.theOutputPath.absolutePath, 
                        // This will inject `elmCompiledTimestamp` into the built
                        // code, which is later used to detect if recompilations are
                        // needed or not. Note: This needs to be the timestamp of
                        // when Elm finished compiling, not when postprocessing
                        // finished. That’s because we haven’t done the
                        // postprocessing yet, but have to inject before that. So
                        // we’re storing the timestamp when Elm finished rather
                        // than when the entire process was finished.
                        Inject.clientCode(outputPath, elmCompiledTimestamp, outputState.compilationMode, outputState.browserUiPosition, runMode.webSocketPort, loggerConfig.debug) + newCode);
                    }
                    catch (unknownError) {
                        const error = toError(unknownError);
                        outputState.setStatus({
                            tag: "WriteOutputError",
                            error,
                            reasonForWriting: "InjectWebSocketClient",
                        });
                        updateStatusLineHelper();
                        return {
                            tag: "CompileError",
                            elmJsonPath,
                            outputPath,
                            outputState,
                        };
                    }
                    const recordFieldsChanged = Inject.recordFieldsChanged(outputState.recordFields, recordFields);
                    const fileSize = Buffer.byteLength(newCode);
                    outputState.recordFields = recordFields;
                    outputState.setStatus({
                        tag: "Success",
                        elmFileSize: fileSize,
                        postprocessFileSize: fileSize,
                        elmCompiledTimestamp,
                    });
                    updateStatusLineHelper();
                    return recordFieldsChanged
                        ? {
                            tag: "FullyCompiledJSButRecordFieldsChanged",
                            outputPath,
                        }
                        : {
                            tag: "FullyCompiledJS",
                            outputPath,
                            outputState,
                            code: newCode,
                            elmCompiledTimestamp,
                        };
                }
                case "Postprocess": {
                    outputState.setStatus({
                        tag: "QueuedForPostprocess",
                        postprocessArray: postprocess.postprocessArray,
                        code: newCode,
                        elmCompiledTimestamp,
                        recordFields,
                    });
                    updateStatusLineHelper();
                    return { tag: "Nothing" };
                }
            }
        }
    }
}
function needsToWriteProxyFile(outputPath, versionedIdentifier) {
    let handle;
    try {
        handle = fs.openSync(outputPath.absolutePath, "r");
    }
    catch (unknownError) {
        const error = toError(unknownError);
        return error.code === "ENOENT"
            ? { tag: "Needed" }
            : /* istanbul ignore next */ { tag: "ReadError", error };
    }
    const buffer = Buffer.alloc(versionedIdentifier.byteLength);
    try {
        fs.readSync(handle, buffer);
    }
    catch (unknownError) {
        const error = toError(unknownError);
        return { tag: "ReadError", error };
    }
    return buffer.equals(versionedIdentifier)
        ? { tag: "NotNeeded" }
        : { tag: "Needed" };
}
async function postprocessHelper({ env, logger, runMode, elmWatchJsonPath, elmJsonPath, outputPath, outputState, index, total, postprocessArray, postprocessWorkerPool, code, elmCompiledTimestamp, recordFields, }) {
    const updateStatusLineHelper = () => {
        updateStatusLine({
            logger,
            runMode: runMode.tag,
            outputPath,
            outputState,
            index,
            total,
        });
    };
    const { promise, kill } = runPostprocess({
        env,
        elmWatchJsonPath,
        compilationMode: outputState.compilationMode,
        runMode: runMode.tag,
        outputPath,
        postprocessArray,
        postprocessWorkerPool,
        code,
    });
    outputState.setStatus({ tag: "Postprocess", kill });
    updateStatusLineHelper();
    const postprocessResult = await promise;
    // There’s no need doing the usual `if (outputState.dirty)` check here, since
    // we always `.kill()` running postprocessing when marking as dirty (which is
    // handled below).
    switch (postprocessResult.tag) {
        case "Killed":
            outputState.dirty = true;
            outputState.setStatus({ tag: "Interrupted" });
            updateStatusLineHelper();
            return { tag: "Nothing" };
        case "Success": {
            try {
                fs.mkdirSync(absoluteDirname(outputPath.theOutputPath).absolutePath, {
                    recursive: true,
                });
                switch (runMode.tag) {
                    case "make":
                        fs.writeFileSync(outputPath.theOutputPath.absolutePath, postprocessResult.code);
                        break;
                    case "hot": {
                        const clientCode = Inject.clientCode(outputPath, elmCompiledTimestamp, outputState.compilationMode, outputState.browserUiPosition, runMode.webSocketPort, logger.config.debug);
                        fs.writeFileSync(outputPath.theOutputPath.absolutePath, typeof postprocessResult.code === "string"
                            ? clientCode + postprocessResult.code
                            : Buffer.concat([
                                Buffer.from(clientCode),
                                postprocessResult.code,
                            ]));
                        break;
                    }
                }
            }
            catch (unknownError) {
                const error = toError(unknownError);
                outputState.setStatus({
                    tag: "WriteOutputError",
                    error,
                    reasonForWriting: "Postprocess",
                });
                updateStatusLineHelper();
                return {
                    tag: "CompileError",
                    elmJsonPath,
                    outputPath,
                    outputState,
                };
            }
            const recordFieldsChanged = Inject.recordFieldsChanged(outputState.recordFields, recordFields);
            outputState.recordFields = recordFields;
            outputState.setStatus({
                tag: "Success",
                elmFileSize: Buffer.byteLength(code),
                postprocessFileSize: Buffer.byteLength(postprocessResult.code),
                elmCompiledTimestamp,
            });
            updateStatusLineHelper();
            return recordFieldsChanged
                ? {
                    tag: "FullyCompiledJSButRecordFieldsChanged",
                    outputPath,
                }
                : {
                    tag: "FullyCompiledJS",
                    outputPath,
                    outputState,
                    code: postprocessResult.code,
                    elmCompiledTimestamp,
                };
        }
        default:
            outputState.setStatus(postprocessResult);
            updateStatusLineHelper();
            return {
                tag: "CompileError",
                elmJsonPath,
                outputPath,
                outputState,
            };
    }
}
async function typecheck({ env, logger, getNow, runMode, elmJsonPath, outputs, total, webSocketPort, }) {
    const startTimestamp = getNow().getTime();
    const outputsWithStatus = [];
    const { promise, kill } = SpawnElm.make({
        elmJsonPath,
        compilationMode: "standard",
        // Mentioning the same input twice is an error according to `elm make`.
        // It even resolves symlinks when checking if two inputs are the same!
        inputs: nonEmptyArrayUniqueBy((inputPath) => inputPath.realpath.absolutePath, flattenNonEmptyArray(mapNonEmptyArray(outputs, ({ outputState }) => outputState.inputs))),
        outputPath: { tag: "NullOutputPath" },
        env,
        getNow,
    });
    for (const output of outputs) {
        const outputStatus = {
            tag: "ElmMakeTypecheckOnly",
            elmDurationMs: -1,
            walkerDurationMs: -1,
            kill,
        };
        outputsWithStatus.push({ ...output, outputStatus });
        output.outputState.dirty = false;
        output.outputState.setStatus(outputStatus);
        updateStatusLine({
            logger,
            runMode,
            outputPath: output.outputPath,
            outputState: output.outputState,
            index: output.index,
            total,
        });
    }
    const [elmMakeResult, allRelatedElmFilePathsResults] = await Promise.all([
        promise.then((result) => {
            const durationMs = getNow().getTime() - startTimestamp;
            for (const output of outputsWithStatus) {
                output.outputStatus.elmDurationMs = durationMs;
            }
            return result;
        }),
        Promise.resolve().then(() => outputsWithStatus.map((output) => {
            const thisStartTimestamp = getNow().getTime();
            const allRelatedElmFilePathsResult = getAllRelatedElmFilePaths(elmJsonPath, output.outputState.inputs);
            output.outputStatus.walkerDurationMs =
                getNow().getTime() - thisStartTimestamp;
            return {
                ...output,
                allRelatedElmFilePathsResult,
            };
        })),
    ]);
    for (const { index, outputPath, outputState, allRelatedElmFilePathsResult, } of allRelatedElmFilePathsResults) {
        if (outputState.dirty || elmMakeResult.tag === "Killed") {
            outputState.setStatus({ tag: "Interrupted" });
            updateStatusLine({
                logger,
                runMode,
                outputPath,
                outputState,
                index,
                total,
            });
            continue;
        }
        outputState.allRelatedElmFilePaths = allRelatedElmFilePathsWithFallback(allRelatedElmFilePathsResult, outputState);
        const combinedResult = combineResults(onlyElmMakeErrorsRelatedToOutput(outputState, elmMakeResult), allRelatedElmFilePathsResult);
        const proxyFileResult = needsToWriteProxyFile(outputPath.theOutputPath, Buffer.from(Inject.versionedIdentifier(outputPath.targetName, webSocketPort)));
        switch (proxyFileResult.tag) {
            case "Needed":
                try {
                    fs.mkdirSync(absoluteDirname(outputPath.theOutputPath).absolutePath, {
                        recursive: true,
                    });
                    fs.writeFileSync(outputPath.theOutputPath.absolutePath, Inject.proxyFile(outputPath, getNow().getTime(), outputState.browserUiPosition, webSocketPort, logger.config.debug));
                    // The proxy file doesn’t count as writing to disk…
                    outputState.setStatus({ tag: "NotWrittenToDisk" });
                }
                catch (unknownError) {
                    const error = toError(unknownError);
                    outputState.setStatus({ tag: "WriteProxyOutputError", error });
                }
                break;
            case "NotNeeded":
                outputState.setStatus({ tag: "NotWrittenToDisk" });
                break;
            case "ReadError":
                outputState.setStatus({
                    tag: "NeedsToWriteProxyFileReadError",
                    error: proxyFileResult.error,
                    triedPath: outputPath.theOutputPath,
                });
                break;
        }
        switch (combinedResult.tag) {
            case "elm make success + walker success":
                break;
            // In all of the remaining cases, `elm make` and
            // `getAllRelatedElmFilePaths` errors are more important than proxy file
            // errors.
            case "elm make success + walker failure":
                outputState.setStatus(combinedResult.walkerError);
                break;
            case "elm make failure + walker success":
                outputState.setStatus(combinedResult.elmMakeError);
                break;
            case "elm make failure + walker failure":
                // If `elm make` failed, don’t bother with `getAllRelatedElmFilePaths` errors.
                outputState.setStatus(combinedResult.elmMakeError);
                break;
        }
        updateStatusLine({
            logger,
            runMode,
            outputPath,
            outputState,
            index,
            total,
        });
    }
}
function onlyElmMakeErrorsRelatedToOutput(outputState, elmMakeResult) {
    if (!(elmMakeResult.tag === "ElmMakeError" &&
        elmMakeResult.error.tag === "CompileErrors")) {
        // Note: In this case we don’t know which targets the error is for. In
        // theory, just one target might be the culprit for this error. We used to
        // have code that re-ran typecheck-only with one target at a time to know
        // for sure. However, when writing tests I couldn’t figure out when it could
        // happen. The only time that code path I could find was triggered was when
        // installing dependencies failed due to no Internet connection, but then we
        // _do_ know that it wasn’t target specific. So KISS: Show these errors for
        // all targets. Worst case one error is shown too many times. Not the end of
        // the world.
        return elmMakeResult;
    }
    const errors = elmMakeResult.error.errors.filter((error) => outputState.allRelatedElmFilePaths.has(error.path.absolutePath));
    return isNonEmptyArray(errors)
        ? {
            tag: "ElmMakeError",
            error: { tag: "CompileErrors", errors },
            extraError: elmMakeResult.extraError,
        }
        : { tag: "Success" };
}
function combineResults(elmMakeResult, allRelatedElmFilePathsResult) {
    switch (elmMakeResult.tag) {
        case "Success":
            switch (allRelatedElmFilePathsResult.tag) {
                case "Success":
                    return {
                        tag: "elm make success + walker success",
                        allRelatedElmFilePaths: allRelatedElmFilePathsResult.allRelatedElmFilePaths,
                    };
                default:
                    return {
                        tag: "elm make success + walker failure",
                        walkerError: allRelatedElmFilePathsResult,
                    };
            }
        default:
            switch (allRelatedElmFilePathsResult.tag) {
                case "Success":
                    return {
                        tag: "elm make failure + walker success",
                        elmMakeError: elmMakeResult,
                        allRelatedElmFilePaths: allRelatedElmFilePathsResult.allRelatedElmFilePaths,
                    };
                default:
                    return {
                        tag: "elm make failure + walker failure",
                        elmMakeError: elmMakeResult,
                        walkerError: allRelatedElmFilePathsResult,
                    };
            }
    }
}
// This allows us to _always_ move the cursor in `updateStatusLine`, even the
// “first” time which makes everything so much simpler.
export function printSpaceForOutputs(logger, runMode, outputActions) {
    if (!logger.config.isTTY) {
        return;
    }
    if (isNonEmptyArray(outputActions.outputsWithoutAction)) {
        for (let index = 0; index < outputActions.total; index++) {
            const output = outputActions.outputsWithoutAction.find((output2) => output2.index === index);
            if (output === undefined) {
                writeNewLines(logger, 1);
            }
            else {
                logger.write(statusLine(logger.config, runMode, output.outputPath, output.outputState));
            }
        }
    }
    else {
        writeNewLines(logger, outputActions.total);
    }
}
function writeNewLines(logger, count) {
    // istanbul ignore else
    if (count > 0) {
        // -1 because the logger always adds a newline.
        logger.write("\n".repeat(count - 1));
    }
}
function updateStatusLine({ logger, runMode, outputPath, outputState, index, total, }) {
    logger.moveCursor(0, -total + index);
    logger.clearLine(0);
    logger.write(statusLine(logger.config, runMode, outputPath, outputState));
    logger.moveCursor(0, total - index - 1);
}
export const EMOJI = {
    QueuedForElmMake: {
        emoji: "⚪️",
        description: "queued for elm make",
    },
    QueuedForPostprocess: {
        emoji: "🟢",
        description: "elm make done – queued for postprocess",
    },
    Busy: {
        emoji: "⏳",
        description: "elm make or postprocess",
    },
    Error: {
        emoji: "🚨",
        description: "error",
    },
    Skipped: {
        emoji: "⛔️",
        description: "skipped",
    },
    Success: {
        emoji: "✅",
        description: "success",
    },
    Information: {
        emoji: "ℹ️",
        description: "info",
    },
    Stats: {
        emoji: "📊",
        description: "stats",
    },
};
export function emojiWidthFix({ emoji, column, isTTY, }) {
    // Emojis take two terminal columns. At least iTerm sometimes messes up and
    // renders the emoji in full width, but overlaps the next character instead of
    // using two columns of space. We can help it by manually moving the cursor to
    // the intended position. Note: This assumes that we render the emoji at the
    // beginning of a line.
    return `${emoji}${isTTY ? cursorHorizontalAbsolute(column) : ""}`;
}
// I found `\p{Other_Symbol}` (`\p{So}`) in: https://stackoverflow.com/a/45894101
// It means “various symbols that are not math symbols, currency signs, or
// combining characters” according to: https://www.regular-expressions.info/unicode.html
// As far as I can tell, that can match more than emoji, but should be fine for
// this use case.
// `[\u{1f3fb}-\u{1f3ff}]` are skin tone modifiers: https://css-tricks.com/changing-emoji-skin-tones-programmatically/#aa-removing-and-swapping-skin-tone-modifiers-with-javascript
// `\ufe0f` is a Variation Selector that says that the preceding character
// should be displayed as an emoji: https://unicode-table.com/en/FE0F/
// The second part of the regex matches emoji flags (also invalid ones): https://stackoverflow.com/a/53360239
// This file is good to test with: https://github.com/mathiasbynens/emoji-test-regex-pattern/blob/main/dist/latest/index.txt
// It contains basically all emoji that exist. This regex matches around half of
// them – the “most common ones” in my opinion. The ones not matched are lots of
// combinations like families. See scripts/Emoji.ts for exactly which emojis do
// and do not match this regex.
// We _could_ use this package for near-perfect emoji matching: https://github.com/mathiasbynens/emoji-regex
// But I don’t think it’s worth the extra dependency for this non-core little feature.
export const GOOD_ENOUGH_STARTS_WITH_EMOJI_REGEX = /^(?:\p{Other_Symbol}[\u{1f3fb}-\u{1f3ff}]?\ufe0f?|[🇦-🇿]{2}) /u;
// When you have many targets, it can be nice to have an emoji at the start of
// the name to make the targets easier to distinguish. This function tries to
// improve the emoji terminal situation. If it looks like the target name starts
// with a “common” emoji and a space, do some tweaks:
//
// - Make sure that the emoji takes two cells in the terminal. For example,
//   iTerm2 displays emoji flags in just one cell, while they should use two.
// - Return a `delta` so that alignment and truncation calculations later know
//   better how long the target name is _visually._
//
// What about use of “uncommon” emoji, or emoji elsewhere in the target name?
// Well, it’ll display according to your terminal, while alignment and truncation
// might be a bit off. Not the end of the world. And not the fault of this
// function.
function targetNameEmojiTweak(loggerConfig, targetName) {
    const match = GOOD_ENOUGH_STARTS_WITH_EMOJI_REGEX.exec(targetName);
    if (match === null) {
        return { targetName, delta: 0 };
    }
    // istanbul ignore next
    const content = match[0] ?? "";
    // Avoid emoji on Windows, for example.
    if (!loggerConfig.fancy) {
        return { targetName: targetName.slice(content.length), delta: 0 };
    }
    const start = emojiWidthFix({
        emoji: content.trim(),
        column: 6,
        isTTY: loggerConfig.isTTY,
    });
    return {
        targetName: `${start} ${targetName.slice(content.length)}`,
        // `start.length` is pretty big: Emojis can take many characters, and the
        // escape code to move the cursor takes some as well. In reality, it takes
        // just 2 characters of screen width (2 chars of emoji).
        delta: -start.length + 2,
    };
}
export function printStatusLinesForElmJsonsErrors(logger, project) {
    for (const { outputPath } of project.elmJsonsErrors) {
        const { targetName, delta } = targetNameEmojiTweak(logger.config, outputPath.targetName);
        logger.write(printStatusLine({
            maxWidth: logger.config.columns - delta,
            fancy: logger.config.fancy,
            isTTY: logger.config.isTTY,
            emojiName: "Error",
            string: logger.config.fancy ? targetName : `${targetName}: error`,
        }));
    }
}
export function printErrors(logger, errors) {
    const errorStrings = Array.from(new Set(errors.map((template) => Errors.toTerminalString(template, logger.config.columns, logger.config.noColor))));
    logger.write("");
    logger.write(join(errorStrings, "\n\n"));
    logger.write("");
    printNumErrors(logger, errorStrings.length);
}
export function printNumErrors(logger, numErrors) {
    logger.write(printStatusLine({
        maxWidth: logger.config.columns,
        fancy: logger.config.fancy,
        isTTY: logger.config.isTTY,
        emojiName: "Error",
        string: `${bold(numErrors.toString())} error${numErrors === 1 ? "" : "s"} found`,
    }));
}
function statusLine(loggerConfig, runMode, outputPath, outputState) {
    const { status } = outputState;
    const { targetName, delta } = targetNameEmojiTweak(loggerConfig, outputPath.targetName);
    const helper = (emojiName, string) => printStatusLine({
        maxWidth: loggerConfig.columns - delta,
        fancy: loggerConfig.fancy,
        isTTY: loggerConfig.isTTY,
        emojiName,
        string,
    });
    const withExtraDetailsAtEnd = (extra, emojiName, start) => {
        const strings = extra.flatMap((item) => item ?? []);
        // istanbul ignore if
        if (!isNonEmptyArray(strings)) {
            return helper(emojiName, start);
        }
        // Emojis take two terminal columns, plus a space that we add after.
        const startLength = (loggerConfig.fancy ? start.length + 3 : start.length) + delta;
        const end = join(strings, "   ");
        const max = Math.min(loggerConfig.columns, 100);
        const padding = loggerConfig.isTTY
            ? Math.max(3, max - end.length - startLength)
            : 3;
        // The `\0` business is a clever way of truncating without messing up the
        // `dim` color.
        return helper(emojiName, `${start}\0${" ".repeat(padding - 1)}${end}`).replace(/\0(.*)$/, dim(" $1"));
    };
    switch (status.tag) {
        case "NotWrittenToDisk": {
            return withExtraDetailsAtEnd([maybePrintDurations(loggerConfig, outputState.flushDurations())], "Success", loggerConfig.fancy ? targetName : `${targetName}: success`);
        }
        case "Success": {
            return withExtraDetailsAtEnd([
                maybePrintFileSize({
                    runMode,
                    compilationMode: outputState.compilationMode,
                    elmFileSize: status.elmFileSize,
                    postprocessFileSize: status.postprocessFileSize,
                    fancy: loggerConfig.fancy,
                }),
                maybePrintDurations(loggerConfig, outputState.flushDurations()),
            ], "Success", loggerConfig.fancy ? targetName : `${targetName}: success`);
        }
        case "ElmMake": {
            const arg = SpawnElm.compilationModeToArg(status.compilationMode);
            const flags = arg === undefined ? "" : ` ${arg}`;
            return helper("Busy", `${targetName}: elm make${flags}`);
        }
        case "ElmMakeTypecheckOnly":
            return helper("Busy", `${targetName}: elm make (typecheck only)`);
        case "Postprocess":
            return helper("Busy", `${targetName}: postprocess`);
        case "Interrupted":
            return helper("Busy", `${targetName}: interrupted`);
        case "QueuedForElmMake":
            return helper("QueuedForElmMake", `${targetName}: queued`);
        case "QueuedForPostprocess":
            return helper("QueuedForPostprocess", `${targetName}: elm make done`);
        // istanbul ignore next
        case "ElmNotFoundError":
        case "CommandNotFoundError":
        case "OtherSpawnError":
        case "UnexpectedElmMakeOutput":
        case "PostprocessStdinWriteError":
        case "PostprocessNonZeroExit":
        case "ElmWatchNodeMissingScript":
        case "ElmWatchNodeImportError":
        case "ElmWatchNodeDefaultExportNotFunction":
        case "ElmWatchNodeRunError":
        case "ElmWatchNodeBadReturnValue":
        case "ElmMakeCrashError":
        case "ElmMakeJsonParseError":
        case "ElmMakeError":
        case "ElmJsonReadAsJsonError":
        case "ElmJsonDecodeError":
        case "ImportWalkerFileSystemError":
        case "NeedsToWriteProxyFileReadError":
        case "ReadOutputError":
        case "WriteOutputError":
        case "WriteProxyOutputError":
            return helper("Error", loggerConfig.fancy ? targetName : `${targetName}: error`);
    }
}
export function printStatusLine({ maxWidth, fancy, isTTY, emojiName, string, }) {
    // Emojis take two terminal columns. At least iTerm sometimes messes up and
    // renders the emoji in full width, but overlaps the next character instead of
    // using two columns of space. We can help it by manually moving the cursor to
    // the intended position. Note: This assumes that we render the emoji at the
    // beginning of a line.
    const emojiString = emojiWidthFix({
        emoji: EMOJI[emojiName].emoji,
        column: 3,
        isTTY,
    });
    const stringWithEmoji = fancy ? `${emojiString} ${string}` : string;
    if (!isTTY) {
        return stringWithEmoji;
    }
    // Emojis take two terminal columns, plus a space that we add after.
    const length = fancy ? string.length + 3 : string.length;
    return length <= maxWidth
        ? stringWithEmoji
        : fancy
            ? // Again, account for the emoji.
                `${emojiString} ${string.slice(0, maxWidth - 4)}…`
            : `${string.slice(0, maxWidth - 3)}...`;
}
function maybePrintFileSize({ runMode, compilationMode, elmFileSize, postprocessFileSize, fancy, }) {
    switch (runMode) {
        case "make":
            switch (compilationMode) {
                case "debug":
                case "standard":
                    return undefined;
                case "optimize":
                    return postprocessFileSize === elmFileSize
                        ? printFileSize(elmFileSize)
                        : `${printFileSize(elmFileSize)} ${fancy ? "→" : "->"} ${printFileSize(postprocessFileSize)} (${((postprocessFileSize / elmFileSize) *
                            100).toFixed(1)} %)`;
            }
        case "hot":
            return undefined;
    }
}
function maybePrintDurations(loggerConfig, durations) {
    if (!isNonEmptyArray(durations)) {
        return undefined;
    }
    const newDurations = durations.some((duration) => duration.tag === "QueuedForElmMake")
        ? durations
        : [{ tag: "QueuedForElmMake", durationMs: 0 }, ...durations];
    return join(mapNonEmptyArray(newDurations, (duration) => printDuration(loggerConfig.mockedTimings
        ? mockDuration(duration)
        : /* istanbul ignore next */ duration, loggerConfig.fancy)), " | ");
}
function printDuration(duration, fancy) {
    switch (duration.tag) {
        case "QueuedForElmMake":
            return `${printDurationMs(duration.durationMs)} Q`;
        case "ElmMake":
        case "ElmMakeTypecheckOnly":
            return `${printDurationMs(duration.elmDurationMs)} ${duration.tag === "ElmMake" ? "E" : "T"}${duration.walkerDurationMs === -1
                ? ""
                : ` ${fancy ? "¦" : "/"} ${printDurationMs(duration.walkerDurationMs)} W`}`;
        case "Inject":
            return `${printDurationMs(duration.durationMs)} I`;
        case "QueuedForPostprocess":
            return `${printDurationMs(duration.durationMs)} R`;
        case "Postprocess":
            return `${printDurationMs(duration.durationMs)} P`;
    }
}
function mockDuration(duration) {
    switch (duration.tag) {
        case "QueuedForElmMake":
            return {
                tag: "QueuedForElmMake",
                durationMs: 1,
            };
        case "ElmMake":
            return {
                tag: "ElmMake",
                elmDurationMs: 1234,
                walkerDurationMs: duration.walkerDurationMs === -1 ? -1 : 55,
            };
        case "ElmMakeTypecheckOnly":
            return {
                tag: "ElmMakeTypecheckOnly",
                elmDurationMs: 765,
                walkerDurationMs: 50,
            };
        case "Inject":
            return {
                tag: "Inject",
                durationMs: 9,
            };
        case "QueuedForPostprocess":
            return {
                tag: "QueuedForPostprocess",
                durationMs: 0,
            };
        case "Postprocess":
            return {
                tag: "Postprocess",
                durationMs: 31234,
            };
    }
}
export function extractErrors(project) {
    return [
        ...project.elmJsonsErrors.map(renderElmJsonError),
        ...Array.from(project.elmJsons).flatMap(([elmJsonPath, outputs]) => Array.from(outputs).flatMap(([outputPath, { status }]) => renderOutputErrors(project.elmWatchJsonPath, elmJsonPath, outputPath, status, true))),
    ];
}
export function renderElmJsonError({ outputPath, error, }) {
    switch (error.tag) {
        case "ElmJsonNotFound":
            return Errors.elmJsonNotFound(outputPath, error.elmJsonNotFound, error.foundElmJsonPaths);
        case "NonUniqueElmJsonPaths":
            return Errors.nonUniqueElmJsonPaths(outputPath, error.nonUniqueElmJsonPaths);
        case "InputsNotFound":
            return Errors.inputsNotFound(outputPath, error.inputsNotFound);
        case "InputsFailedToResolve":
            return Errors.inputsFailedToResolve(outputPath, error.inputsFailedToResolve);
        case "DuplicateInputs":
            return Errors.duplicateInputs(outputPath, error.duplicates);
    }
}
export function renderOutputErrors(elmWatchJsonPath, elmJsonPath, outputPath, status, includeStuckInProgressState = false) {
    switch (status.tag) {
        case "NotWrittenToDisk":
            return [];
        // istanbul ignore next
        case "ElmMake":
        // istanbul ignore next
        case "ElmMakeTypecheckOnly":
        // istanbul ignore next
        case "Postprocess":
        // istanbul ignore next
        case "Interrupted":
        case "QueuedForElmMake":
            return includeStuckInProgressState
                ? [Errors.stuckInProgressState(outputPath, status.tag)]
                : // istanbul ignore next
                    [];
        // If there are `elm make` errors we skip postprocessing (fail fast).
        case "QueuedForPostprocess":
            return [];
        case "Success":
            return [];
        // istanbul ignore next
        case "ElmNotFoundError":
            return [Errors.elmNotFoundError(outputPath, status.command)];
        case "CommandNotFoundError":
            return [Errors.commandNotFoundError(outputPath, status.command)];
        // istanbul ignore next
        case "OtherSpawnError":
            return [Errors.otherSpawnError(outputPath, status.error, status.command)];
        case "UnexpectedElmMakeOutput":
            return [
                Errors.unexpectedElmMakeOutput(outputPath, status.exitReason, status.stdout, status.stderr, status.command),
            ];
        case "PostprocessStdinWriteError":
            return [
                Errors.postprocessStdinWriteError(outputPath, status.error, status.command),
            ];
        case "PostprocessNonZeroExit":
            return [
                Errors.postprocessNonZeroExit(outputPath, status.exitReason, status.stdout, status.stderr, status.command),
            ];
        case "ElmWatchNodeMissingScript":
            return [Errors.elmWatchNodeMissingScript(elmWatchJsonPath)];
        case "ElmWatchNodeImportError":
            return [
                Errors.elmWatchNodeImportError(status.scriptPath, status.error, status.stdout, status.stderr),
            ];
        case "ElmWatchNodeDefaultExportNotFunction":
            return [
                Errors.elmWatchNodeDefaultExportNotFunction(status.scriptPath, status.imported, status.typeofDefault, status.stdout, status.stderr),
            ];
        case "ElmWatchNodeRunError":
            return [
                Errors.elmWatchNodeRunError(status.scriptPath, status.args, status.error, status.stdout, status.stderr),
            ];
        case "ElmWatchNodeBadReturnValue":
            return [
                Errors.elmWatchNodeBadReturnValue(status.scriptPath, status.args, status.returnValue, status.stdout, status.stderr),
            ];
        case "ElmMakeCrashError":
            return [
                Errors.elmMakeCrashError(outputPath, status.beforeError, status.error, status.command),
            ];
        case "ElmMakeJsonParseError":
            return [
                Errors.elmMakeJsonParseError(outputPath, status.error, status.errorFilePath, status.command),
            ];
        case "ElmMakeError":
            switch (status.error.tag) {
                case "GeneralError":
                    return [
                        Errors.elmMakeGeneralError(outputPath, elmJsonPath, status.error, status.extraError),
                    ];
                case "CompileErrors":
                    return status.error.errors.flatMap((error) => error.problems.map((problem) => Errors.elmMakeProblem(error.path, problem, status.extraError)));
            }
        case "ElmJsonReadAsJsonError":
            return [Errors.readElmJsonAsJson(status.elmJsonPath, status.error)];
        case "ElmJsonDecodeError":
            return [Errors.decodeElmJson(status.elmJsonPath, status.error)];
        case "ImportWalkerFileSystemError":
            return [Errors.importWalkerFileSystemError(outputPath, status.error)];
        case "NeedsToWriteProxyFileReadError":
            return [
                Errors.needsToWriteProxyFileReadError(outputPath, status.error, status.triedPath),
            ];
        case "ReadOutputError":
            return [
                Errors.readOutputError(outputPath, status.error, status.triedPath),
            ];
        case "WriteOutputError":
            return [
                Errors.writeOutputError(outputPath, status.error, status.reasonForWriting),
            ];
        case "WriteProxyOutputError":
            return [Errors.writeProxyOutputError(outputPath, status.error)];
    }
}
function getAllRelatedElmFilePaths(elmJsonPath, inputs) {
    const parseResult = ElmJson.readAndParse(elmJsonPath);
    switch (parseResult.tag) {
        case "Parsed":
            return walkImports(ElmJson.getSourceDirectories(elmJsonPath, parseResult.elmJson), inputs);
        default:
            return parseResult;
    }
}
function allRelatedElmFilePathsWithFallback(walkerResult, outputState) {
    switch (walkerResult.tag) {
        case "Success":
            return walkerResult.allRelatedElmFilePaths;
        case "ImportWalkerFileSystemError":
            return walkerResult.relatedElmFilePathsUntilError;
        case "ElmJsonReadAsJsonError":
        case "ElmJsonDecodeError":
            return new Set(mapNonEmptyArray(outputState.inputs, (inputPath) => inputPath.realpath.absolutePath));
    }
}
// Every target is supposed to have a non-empty set of related Elm file path (at
// least the inputs for the target are related). If we have an empty set, a file
// might have changed while installing dependencies or running the first
// compilation. Or the installation failed. In such situations, find the related
// paths on demand.
// This ignores any errors from the walker. They are supposed to be reported
// from the regular code paths. We’re already in an edge case.
export function ensureAllRelatedElmFilePaths(elmJsonPath, outputState) {
    if (outputState.allRelatedElmFilePaths.size === 0) {
        const result = getAllRelatedElmFilePaths(elmJsonPath, outputState.inputs);
        outputState.allRelatedElmFilePaths = allRelatedElmFilePathsWithFallback(result, outputState);
    }
}
