import * as fs from "fs";
import * as path from "path";
import * as Decode from "tiny-decoders";
import { toError, toJsonError } from "./Helpers.js";
import { IS_WINDOWS } from "./IsWindows.js";
import { isNonEmptyArray, mapNonEmptyArray, NonEmptyArray, } from "./NonEmptyArray.js";
import { findClosest } from "./PathHelpers.js";
import { Port } from "./Port.js";
// First char uppercase: https://github.com/elm/compiler/blob/2860c2e5306cb7093ba28ac7624e8f9eb8cbc867/compiler/src/Parse/Variable.hs#L263-L267
// Rest: https://github.com/elm/compiler/blob/2860c2e5306cb7093ba28ac7624e8f9eb8cbc867/compiler/src/Parse/Variable.hs#L328-L335
// https://hackage.haskell.org/package/base-4.14.0.0/docs/Data-Char.html#v:isLetter
const INPUT_NAME = /(^|[/\\])\p{Lu}[_\d\p{L}]*\.elm$/u;
function isValidInputName(name) {
    return INPUT_NAME.test(name);
}
function isValidOutputName(name) {
    // `elm make` doesn’t accept just `.js` but `a.js` and `a/.js`.
    // Disallow stuff starting with `-` so output CLI args don’t look like flags.
    return !name.startsWith("-") && name.endsWith(".js") && name !== ".js";
}
const TARGET_NAME = /^[^\s-](?:.*\S)?$/;
function isValidTargetName(name) {
    return TARGET_NAME.test(name);
}
const Target = Decode.fieldsAuto({
    inputs: NonEmptyArray(Decode.chain(Decode.string, (string) => {
        if (isValidInputName(string)) {
            return string;
        }
        throw new Decode.DecoderError({
            message: "Inputs must have a valid module name and end with .elm",
            value: string,
        });
    })),
    output: Decode.chain(Decode.string, (output) => {
        if (isValidOutputName(output)) {
            return output;
        }
        throw new Decode.DecoderError({
            message: "Outputs must end with .js",
            value: Decode.DecoderError.MISSING_VALUE,
        });
    }),
}, { exact: "throw" });
function targetRecordHelper(record) {
    const entries = Object.entries(record);
    if (!isNonEmptyArray(entries)) {
        throw new Decode.DecoderError({
            message: "Expected a non-empty object",
            value: record,
        });
    }
    return Object.fromEntries(entries.map(([key, value]) => {
        if (isValidTargetName(key)) {
            return [key, value];
        }
        throw new Decode.DecoderError({
            message: "Target names must start with a non-whitespace character except `-`,\ncannot contain newlines and must end with a non-whitespace character",
            value: Decode.DecoderError.MISSING_VALUE,
            key,
        });
    }));
}
const Config = Decode.fieldsAuto({
    targets: Decode.chain(Decode.record(Target), targetRecordHelper),
    postprocess: Decode.optional(NonEmptyArray(Decode.string)),
    port: Decode.optional(Port),
}, { exact: "throw" });
export function findReadAndParse(cwd) {
    const elmWatchJsonPathRaw = findClosest("elm-watch.json", cwd.path);
    if (elmWatchJsonPathRaw === undefined) {
        return {
            tag: "ElmWatchJsonNotFound",
        };
    }
    const elmWatchJsonPath = {
        tag: "ElmWatchJsonPath",
        theElmWatchJsonPath: elmWatchJsonPathRaw,
    };
    let json = undefined;
    try {
        json = JSON.parse(fs.readFileSync(elmWatchJsonPathRaw.absolutePath, "utf-8"));
    }
    catch (unknownError) {
        const error = toError(unknownError);
        return {
            tag: "ReadAsJsonError",
            elmWatchJsonPath,
            error,
        };
    }
    try {
        return {
            tag: "Parsed",
            elmWatchJsonPath,
            config: Config(json),
        };
    }
    catch (unknownError) {
        const error = toJsonError(unknownError);
        return {
            tag: "DecodeError",
            elmWatchJsonPath,
            error,
        };
    }
}
export function example(cwd, elmWatchJsonPath, elmMakeParsed) {
    const { elmFiles, output = "build/main.js" } = elmMakeParsed;
    const json = {
        targets: {
            "My target name": {
                inputs: isNonEmptyArray(elmFiles)
                    ? mapNonEmptyArray(elmFiles, (file) =>
                        // Use slashes in all paths since they work everywhere (including
                        // Windows), while backslashes only work on Windows.
                        toUnixPath(path.relative(path.dirname(elmWatchJsonPath.theElmWatchJsonPath.absolutePath), path.resolve(cwd.path.absolutePath, file))))
                    : ["src/Main.elm"],
                output,
            },
        },
    };
    return JSON.stringify(json, null, 4);
}
function toUnixPath(filePath) {
    return IS_WINDOWS
        ? /* istanbul ignore next */ filePath.split(path.sep).join(path.posix.sep)
        : filePath;
}
export function parseArgsLikeElmMake(args) {
    return args.reduce((passedParsed, { theArg: arg }) => {
        const parsed = { ...passedParsed, justSawOutputFlag: false };
        switch (arg) {
            case "--debug":
            case "--optimize":
                return parsed;
            case "--output":
                return { ...parsed, justSawOutputFlag: true };
            default: {
                if (passedParsed.justSawOutputFlag) {
                    return isValidOutputName(arg) ? { ...parsed, output: arg } : parsed;
                }
                const outputPrefix = "--output=";
                if (arg.startsWith(outputPrefix)) {
                    const file = arg.slice(outputPrefix.length);
                    return isValidOutputName(file)
                        ? { ...parsed, output: file }
                        : parsed;
                }
                return isValidInputName(arg)
                    ? { ...parsed, elmFiles: parsed.elmFiles.concat(arg) }
                    : parsed;
            }
        }
    }, {
        elmFiles: [],
        output: undefined,
        justSawOutputFlag: false,
    });
}
