import * as fs from "fs";
import * as Decode from "tiny-decoders";
import { toError, toJsonError } from "./Helpers";
import { Port } from "./Port";
import { BrowserUiPosition, CompilationMode, } from "./Types";
const Target = Decode.fieldsAuto({
    compilationMode: Decode.optional(CompilationMode),
    browserUiPosition: Decode.optional(BrowserUiPosition),
    openErrorOverlay: Decode.optional(Decode.boolean),
});
export const ElmWatchStuffJson = Decode.fieldsAuto({
    port: Port,
    targets: Decode.record(Target),
});
export function readAndParse(elmWatchStuffJsonPath) {
    let json = undefined;
    try {
        json = JSON.parse(fs.readFileSync(elmWatchStuffJsonPath.theElmWatchStuffJsonPath.absolutePath, "utf-8"));
    }
    catch (unknownError) {
        const error = toError(unknownError);
        return error.code === "ENOENT"
            ? {
                tag: "NoElmWatchStuffJson",
                elmWatchStuffJsonPath,
            }
            : {
                tag: "ElmWatchStuffJsonReadAsJsonError",
                error,
            };
    }
    try {
        return {
            tag: "Parsed",
            elmWatchStuffJsonPath,
            elmWatchStuffJson: ElmWatchStuffJson(json),
        };
    }
    catch (unknownError) {
        const error = toJsonError(unknownError);
        return {
            tag: "ElmWatchStuffJsonDecodeError",
            error,
        };
    }
}
