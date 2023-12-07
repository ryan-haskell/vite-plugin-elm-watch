import * as fs from "fs";
import * as Decode from "tiny-decoders";
import { toError, toJsonError } from "./Helpers.js";
import { mapNonEmptyArray, NonEmptyArray } from "./NonEmptyArray.js";
import { absoluteDirname, absolutePathFromString } from "./PathHelpers.js";
export const ElmJson = Decode.fieldsUnion("type", {
    application: Decode.fieldsAuto({
        tag: () => "Application",
        "source-directories": NonEmptyArray(Decode.string),
    }),
    package: () => ({
        tag: "Package",
    }),
});
export function readAndParse(elmJsonPath) {
    let json = undefined;
    try {
        json = JSON.parse(fs.readFileSync(elmJsonPath.theElmJsonPath.absolutePath, "utf-8"));
    }
    catch (unknownError) {
        const error = toError(unknownError);
        return {
            tag: "ElmJsonReadAsJsonError",
            elmJsonPath,
            error,
        };
    }
    try {
        return {
            tag: "Parsed",
            elmJson: ElmJson(json),
        };
    }
    catch (unknownError) {
        const error = toJsonError(unknownError);
        return {
            tag: "ElmJsonDecodeError",
            elmJsonPath,
            error,
        };
    }
}
export function getSourceDirectories(elmJsonPath, elmJson) {
    const base = absoluteDirname(elmJsonPath.theElmJsonPath);
    switch (elmJson.tag) {
        case "Application":
            return mapNonEmptyArray(elmJson["source-directories"], (dir) => ({
                tag: "SourceDirectory",
                theSourceDirectory: absolutePathFromString(base, dir),
            }));
        case "Package":
            return [
                {
                    tag: "SourceDirectory",
                    theSourceDirectory: absolutePathFromString(base, "src"),
                },
            ];
    }
}
