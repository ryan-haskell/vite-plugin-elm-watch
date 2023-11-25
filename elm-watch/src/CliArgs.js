import { isNonEmptyArray } from "./NonEmptyArray";
export function parseArgs(runMode, args) {
    let debug = false;
    let optimize = false;
    const unknownFlags = [];
    const targetsSubstrings = [];
    for (const arg of args) {
        switch (arg.theArg) {
            case "--debug":
                debug = true;
                break;
            case "--optimize":
                optimize = true;
                break;
            default:
                if (arg.theArg.startsWith("-")) {
                    unknownFlags.push(arg);
                }
                else {
                    targetsSubstrings.push(arg.theArg);
                }
        }
    }
    switch (runMode) {
        case "hot":
            if (debug || optimize) {
                return { tag: "DebugOptimizeForHot" };
            }
            break;
        case "make":
            if (debug && optimize) {
                return { tag: "DebugOptimizeClash" };
            }
            break;
    }
    if (isNonEmptyArray(unknownFlags)) {
        return {
            tag: "UnknownFlags",
            unknownFlags,
        };
    }
    return {
        tag: "Success",
        compilationMode: debug ? "debug" : optimize ? "optimize" : "standard",
        targetsSubstrings,
    };
}
