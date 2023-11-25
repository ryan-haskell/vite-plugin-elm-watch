import * as os from "os";
import * as ElmJson from "./ElmJson";
import { __ELM_WATCH_MAX_PARALLEL } from "./Env";
import { HashMap } from "./HashMap";
import { HashSet } from "./HashSet";
import { getSetSingleton, silentlyReadIntEnvValue, toError } from "./Helpers";
import { isNonEmptyArray } from "./NonEmptyArray";
import { absoluteDirname, absolutePathFromString, absoluteRealpath, findClosest, longestCommonAncestorPath, } from "./PathHelpers";
// The code base leans towards pure functions, but this data structure is going
// to be mutated a lot.
export class OutputState {
    constructor(inputs, compilationMode, browserUiPosition, openErrorOverlay, getNow) {
        this.getNow = getNow;
        // This one has a method for mutating, for measuring how long time is spent in
        // different statuses.
        this._status = { tag: "NotWrittenToDisk" };
        this._durations = [];
        this._lastStartTimestamp = 0;
        this.openErrorOverlay = false;
        this.allRelatedElmFilePaths = new Set();
        // We only calculate `recordFields` in optimize mode. Having `| undefined`
        // makes that more clear.
        this.recordFields = undefined;
        this.dirty = true;
        this.inputs = inputs;
        this.compilationMode = compilationMode;
        this.browserUiPosition = browserUiPosition;
        this.openErrorOverlay = openErrorOverlay;
    }
    flushDurations() {
        // Clear the durations when getting them. This means that once we have have
        // printed them, we won’t print them again. This way we only show durations
        // for the targets that were affected by the latest compilation cycle.
        const durations = this._durations.slice();
        this._durations.length = 0;
        return durations;
    }
    get status() {
        return this._status;
    }
    setStatus(status) {
        const lastStartTimestamp = this._lastStartTimestamp;
        this._lastStartTimestamp = this.getNow().getTime();
        switch (this._status.tag) {
            case "ElmMake":
                this._durations.push({
                    tag: "ElmMake",
                    elmDurationMs: this._status.elmDurationMs,
                    walkerDurationMs: this._status.walkerDurationMs,
                });
                if (this._status.injectDurationMs !== -1) {
                    this._durations.push({
                        tag: "Inject",
                        durationMs: this._status.injectDurationMs,
                    });
                }
                break;
            case "ElmMakeTypecheckOnly":
                this._durations.push({
                    tag: "ElmMakeTypecheckOnly",
                    elmDurationMs: this._status.elmDurationMs,
                    walkerDurationMs: this._status.walkerDurationMs,
                });
                break;
            case "Postprocess":
            case "QueuedForElmMake":
            case "QueuedForPostprocess":
                this._durations.push({
                    tag: this._status.tag,
                    durationMs: this._lastStartTimestamp - lastStartTimestamp,
                });
                break;
            default:
                this._durations.length = 0;
        }
        this._status = status;
    }
}
export function initProject({ env, getNow, compilationMode, elmWatchJsonPath, config, enabledTargetsSubstrings, elmWatchStuffDir, elmWatchStuffJsonPath, elmWatchStuffJson, }) {
    const disabledOutputs = new HashSet();
    const elmJsonsErrors = [];
    const elmJsons = new HashMap();
    const potentialOutputDuplicates = new HashMap();
    for (const [index, [targetName, target]] of Object.entries(config.targets).entries()) {
        const outputPath = {
            tag: "OutputPath",
            theOutputPath: absolutePathFromString(absoluteDirname(elmWatchJsonPath.theElmWatchJsonPath), target.output),
            temporaryOutputPath: absolutePathFromString(elmWatchStuffDir.theElmWatchStuffDir, `${index}.js`),
            originalString: target.output,
            targetName,
        };
        const previousOutput = potentialOutputDuplicates.get(outputPath.theOutputPath);
        if (previousOutput === undefined) {
            potentialOutputDuplicates.set(outputPath.theOutputPath, [
                outputPath.originalString,
            ]);
        }
        else {
            previousOutput.push(outputPath.originalString);
        }
        if (enabledTargetsSubstrings.some((substring) => targetName.includes(substring))) {
            const resolveElmJsonResult = resolveElmJson(elmWatchJsonPath, target.inputs);
            const persisted = elmWatchStuffJson?.targets[targetName];
            const { compilationMode: thisCompilationMode = compilationMode, browserUiPosition = "BottomLeft", openErrorOverlay = false, } = persisted ?? {};
            switch (resolveElmJsonResult.tag) {
                case "Success": {
                    const previous = elmJsons.get(resolveElmJsonResult.elmJsonPath) ??
                        new HashMap();
                    previous.set(outputPath, new OutputState(resolveElmJsonResult.inputs, thisCompilationMode, browserUiPosition, openErrorOverlay, getNow));
                    elmJsons.set(resolveElmJsonResult.elmJsonPath, previous);
                    break;
                }
                default:
                    elmJsonsErrors.push({
                        outputPath,
                        compilationMode: thisCompilationMode,
                        browserUiPosition,
                        openErrorOverlay,
                        error: resolveElmJsonResult,
                    });
                    break;
            }
        }
        else {
            disabledOutputs.add(outputPath);
        }
    }
    const duplicateOutputs = Array.from(potentialOutputDuplicates)
        .filter(([, outputPaths]) => outputPaths.length >= 2)
        .map(([absolutePath, originalOutputPathStrings]) => ({
        originalOutputPathStrings,
        absolutePath,
    }));
    if (isNonEmptyArray(duplicateOutputs)) {
        return {
            tag: "DuplicateOutputs",
            duplicates: duplicateOutputs,
        };
    }
    const paths = [
        absoluteDirname(elmWatchJsonPath.theElmWatchJsonPath),
        ...Array.from(elmJsons.keys()).flatMap((elmJsonPath) => {
            // This is a bit weird, but we can actually ignore errors here. Some facts:
            // - We want to run Elm even if the elm.json is invalid, because Elm has
            //   really nice error messages.
            // - We run `ElmJson.readAndParse` again later and do report the errors then.
            //   (But in practice you won’t see them because we show Elm’s errors instead.)
            // - Regardless of whether we report the errors here we can’t know the
            //   real watch root until it becomes valid. The best guess is to just
            //   use the elm-watch.json and elm.json paths then.
            const result = ElmJson.readAndParse(elmJsonPath);
            switch (result.tag) {
                case "Parsed":
                    return [
                        absoluteDirname(elmJsonPath.theElmJsonPath),
                        ...ElmJson.getSourceDirectories(elmJsonPath, result.elmJson).map((sourceDirectory) => sourceDirectory.theSourceDirectory),
                    ];
                case "ElmJsonReadAsJsonError":
                case "ElmJsonDecodeError":
                    return [absoluteDirname(elmJsonPath.theElmJsonPath)];
            }
        }),
    ];
    const watchRoot = longestCommonAncestorPath(paths);
    // istanbul ignore if
    if (watchRoot === undefined) {
        return { tag: "NoCommonRoot", paths };
    }
    const maxParallel = silentlyReadIntEnvValue(env[__ELM_WATCH_MAX_PARALLEL], os.cpus().length);
    const postprocess = config.postprocess === undefined
        ? { tag: "NoPostprocess" }
        : { tag: "Postprocess", postprocessArray: config.postprocess };
    return {
        tag: "Project",
        project: {
            watchRoot,
            elmWatchJsonPath,
            elmWatchStuffJsonPath,
            disabledOutputs,
            elmJsonsErrors,
            elmJsons,
            maxParallel,
            postprocess,
        },
    };
}
function resolveElmJson(elmWatchJsonPath, inputStrings) {
    const inputs = [];
    const inputsNotFound = [];
    const inputsFailedToResolve = [];
    const resolved = new HashMap();
    for (const inputString of inputStrings) {
        const uncheckedInputPath = {
            tag: "UncheckedInputPath",
            theUncheckedInputPath: absolutePathFromString(absoluteDirname(elmWatchJsonPath.theElmWatchJsonPath), inputString),
            originalString: inputString,
        };
        let realpath;
        try {
            realpath = absoluteRealpath(uncheckedInputPath.theUncheckedInputPath);
        }
        catch (unknownError) {
            const error = toError(unknownError);
            if (error.code === "ENOENT" || error.code === "ENOTDIR") {
                inputsNotFound.push(uncheckedInputPath);
            }
            else {
                inputsFailedToResolve.push({ inputPath: uncheckedInputPath, error });
            }
            continue;
        }
        const inputPath = {
            tag: "InputPath",
            theInputPath: uncheckedInputPath.theUncheckedInputPath,
            originalString: inputString,
            realpath,
        };
        const previous = resolved.get(realpath);
        if (previous === undefined) {
            resolved.set(realpath, [inputPath]);
        }
        else {
            previous.push(inputPath);
        }
        inputs.push(inputPath);
    }
    if (isNonEmptyArray(inputsNotFound)) {
        return {
            tag: "InputsNotFound",
            inputsNotFound,
        };
    }
    if (isNonEmptyArray(inputsFailedToResolve)) {
        return {
            tag: "InputsFailedToResolve",
            inputsFailedToResolve,
        };
    }
    const duplicateInputs = Array.from(resolved)
        .filter(([, inputPaths]) => inputPaths.length >= 2)
        .map(([resolvedPath, inputPaths]) => ({
        resolved: resolvedPath,
        inputs: inputPaths,
    }));
    if (isNonEmptyArray(duplicateInputs)) {
        return {
            tag: "DuplicateInputs",
            duplicates: duplicateInputs,
        };
    }
    const elmJsonNotFound = [];
    const elmJsonPaths = [];
    for (const inputPath of inputs) {
        const elmJsonPathRaw = findClosest("elm.json", absoluteDirname(inputPath.theInputPath));
        if (elmJsonPathRaw === undefined) {
            elmJsonNotFound.push(inputPath);
        }
        else {
            elmJsonPaths.push({
                inputPath,
                elmJsonPath: { tag: "ElmJsonPath", theElmJsonPath: elmJsonPathRaw },
            });
        }
    }
    if (isNonEmptyArray(elmJsonNotFound)) {
        return {
            tag: "ElmJsonNotFound",
            elmJsonNotFound,
            foundElmJsonPaths: elmJsonPaths,
        };
    }
    const elmJsonPathsSet = new HashSet(elmJsonPaths.map(({ elmJsonPath }) => elmJsonPath));
    const uniqueElmJsonPath = getSetSingleton(elmJsonPathsSet);
    if (uniqueElmJsonPath === undefined) {
        return {
            tag: "NonUniqueElmJsonPaths",
            // At this point we know for sure that `elmJsonPaths` must be non-empty.
            nonUniqueElmJsonPaths: elmJsonPaths,
        };
    }
    return {
        tag: "Success",
        elmJsonPath: uniqueElmJsonPath,
        // At this point we know for sure that `inputs` must be non-empty.
        inputs: inputs,
    };
}
export function getFlatOutputs(project) {
    return Array.from(project.elmJsons.entries()).flatMap(([elmJsonPath, outputs]) => Array.from(outputs, ([outputPath, outputState]) => ({
        elmJsonPath,
        outputPath,
        outputState,
    })));
}
export function projectToDebug(project) {
    return {
        watchRoot: project.watchRoot.absolutePath,
        elmWatchJson: project.elmWatchJsonPath.theElmWatchJsonPath.absolutePath,
        elmWatchStuffJson: project.elmWatchStuffJsonPath.theElmWatchStuffJsonPath.absolutePath,
        maxParallel: project.maxParallel,
        postprocess: project.postprocess,
        enabledTargets: Array.from(project.elmJsons.entries()).flatMap(([elmJsonPath, outputs]) => Array.from(outputs.entries(), ([outputPath, outputState]) => ({
            ...outputPathToDebug(outputPath),
            compilationMode: outputState.compilationMode,
            elmJson: elmJsonPath.theElmJsonPath.absolutePath,
            inputs: outputState.inputs.map(inputPathToDebug),
        }))),
        disabledTargets: Array.from(project.disabledOutputs, outputPathToDebug),
        erroredTargets: project.elmJsonsErrors.map(({ outputPath, compilationMode, error }) => ({
            error: error.tag,
            ...outputPathToDebug(outputPath),
            compilationMode,
        })),
    };
}
function outputPathToDebug(outputPath) {
    return {
        targetName: outputPath.targetName,
        output: outputPath.theOutputPath.absolutePath,
        temporaryOutput: outputPath.temporaryOutputPath.absolutePath,
        originalString: outputPath.originalString,
    };
}
function inputPathToDebug(inputPath) {
    return {
        input: inputPath.theInputPath.absolutePath,
        realpath: inputPath.realpath.absolutePath,
        originalString: inputPath.originalString,
    };
}
