import * as Decode from "tiny-decoders";
import { AbsolutePath, BrowserUiPosition, CompilationMode } from "../src/Types";
const FocusedTabAcknowledged = Decode.fieldsAuto({
    tag: () => "FocusedTabAcknowledged",
});
const OpenEditorError = Decode.fieldsUnion("tag", {
    EnvNotSet: Decode.fieldsAuto({
        tag: () => "EnvNotSet",
    }),
    CommandFailed: Decode.fieldsAuto({
        tag: () => "CommandFailed",
        message: Decode.string,
    }),
});
const OpenEditorFailed = Decode.fieldsAuto({
    tag: () => "OpenEditorFailed",
    error: OpenEditorError,
});
const ErrorLocation = Decode.fieldsUnion("tag", {
    FileOnly: Decode.fieldsAuto({
        tag: () => "FileOnly",
        file: AbsolutePath,
    }),
    FileWithLineAndColumn: Decode.fieldsAuto({
        tag: () => "FileWithLineAndColumn",
        file: AbsolutePath,
        line: Decode.number,
        column: Decode.number,
    }),
    Target: Decode.fieldsAuto({
        tag: () => "Target",
        targetName: Decode.string,
    }),
});
const CompileError = Decode.fieldsAuto({
    title: Decode.string,
    location: Decode.optional(ErrorLocation),
    htmlContent: Decode.string,
});
const StatusChanged = Decode.fieldsAuto({
    tag: () => "StatusChanged",
    status: Decode.fieldsUnion("tag", {
        AlreadyUpToDate: Decode.fieldsAuto({
            tag: () => "AlreadyUpToDate",
            compilationMode: CompilationMode,
            browserUiPosition: BrowserUiPosition,
        }),
        Busy: Decode.fieldsAuto({
            tag: () => "Busy",
            compilationMode: CompilationMode,
            browserUiPosition: BrowserUiPosition,
        }),
        CompileError: Decode.fieldsAuto({
            tag: () => "CompileError",
            compilationMode: CompilationMode,
            browserUiPosition: BrowserUiPosition,
            openErrorOverlay: Decode.boolean,
            errors: Decode.array(CompileError),
            foregroundColor: Decode.string,
            backgroundColor: Decode.string,
        }),
        ElmJsonError: Decode.fieldsAuto({
            tag: () => "ElmJsonError",
            error: Decode.string,
        }),
        ClientError: Decode.fieldsAuto({
            tag: () => "ClientError",
            message: Decode.string,
        }),
    }),
});
const SuccessfullyCompiled = Decode.fieldsAuto({
    tag: () => "SuccessfullyCompiled",
    code: Decode.string,
    elmCompiledTimestamp: Decode.number,
    compilationMode: CompilationMode,
    browserUiPosition: BrowserUiPosition,
});
const SuccessfullyCompiledButRecordFieldsChanged = Decode.fieldsAuto({
    tag: () => "SuccessfullyCompiledButRecordFieldsChanged",
});
export const WebSocketToClientMessage = Decode.fieldsUnion("tag", {
    FocusedTabAcknowledged,
    OpenEditorFailed,
    StatusChanged,
    SuccessfullyCompiled,
    SuccessfullyCompiledButRecordFieldsChanged,
});
export const WebSocketToServerMessage = Decode.fieldsUnion("tag", {
    ChangedCompilationMode: Decode.fieldsAuto({
        tag: () => "ChangedCompilationMode",
        compilationMode: CompilationMode,
    }),
    ChangedBrowserUiPosition: Decode.fieldsAuto({
        tag: () => "ChangedBrowserUiPosition",
        browserUiPosition: BrowserUiPosition,
    }),
    ChangedOpenErrorOverlay: Decode.fieldsAuto({
        tag: () => "ChangedOpenErrorOverlay",
        openErrorOverlay: Decode.boolean,
    }),
    FocusedTab: Decode.fieldsAuto({
        tag: () => "FocusedTab",
    }),
    PressedOpenEditor: Decode.fieldsAuto({
        tag: () => "PressedOpenEditor",
        file: AbsolutePath,
        line: Decode.number,
        column: Decode.number,
    }),
});
export function encodeWebSocketToClientMessage(message) {
    switch (message.tag) {
        // Optimization: Avoid encoding megabytes of JS code as a JSON string.
        // With a large Elm app, `JSON.stringify` + `JSON.parse` can time ~40 ms.
        case "SuccessfullyCompiled": {
            const shortMessage = { ...message, code: "" };
            return `//${JSON.stringify(shortMessage)}\n${message.code}`;
        }
        default:
            return JSON.stringify(message);
    }
}
export function decodeWebSocketToClientMessage(message) {
    if (message.startsWith("//")) {
        const newlineIndexRaw = message.indexOf("\n");
        const newlineIndex = newlineIndexRaw === -1 ? message.length : newlineIndexRaw;
        const jsonString = message.slice(2, newlineIndex);
        const parsed = SuccessfullyCompiled(JSON.parse(jsonString));
        return { ...parsed, code: message };
    }
    else {
        return WebSocketToClientMessage(JSON.parse(message));
    }
}
