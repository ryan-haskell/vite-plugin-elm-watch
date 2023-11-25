import * as Decode from "tiny-decoders";
export type OpenEditorError = ReturnType<typeof OpenEditorError>;
declare const OpenEditorError: Decode.Decoder<{
    tag: "EnvNotSet";
} | {
    tag: "CommandFailed";
    message: string;
}, unknown>;
export type ErrorLocation = ReturnType<typeof ErrorLocation>;
declare const ErrorLocation: Decode.Decoder<{
    file?: unknown;
    tag: "FileOnly";
} | {
    file?: unknown;
    tag: "FileWithLineAndColumn";
    line: number;
    column: number;
} | {
    tag: "Target";
    targetName: string;
}, unknown>;
export type CompileError = ReturnType<typeof CompileError>;
declare const CompileError: Decode.Decoder<{
    location?: {
        file?: unknown;
        tag: "FileOnly";
    } | {
        file?: unknown;
        tag: "FileWithLineAndColumn";
        line: number;
        column: number;
    } | {
        tag: "Target";
        targetName: string;
    } | undefined;
    title: string;
    htmlContent: string;
}, unknown>;
export type StatusChanged = ReturnType<typeof StatusChanged>;
declare const StatusChanged: Decode.Decoder<{
    tag: "StatusChanged";
    status: {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        tag: "AlreadyUpToDate";
    } | {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        tag: "Busy";
    } | {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        tag: "CompileError";
        openErrorOverlay: boolean;
        errors: {
            location?: {
                file?: unknown;
                tag: "FileOnly";
            } | {
                file?: unknown;
                tag: "FileWithLineAndColumn";
                line: number;
                column: number;
            } | {
                tag: "Target";
                targetName: string;
            } | undefined;
            title: string;
            htmlContent: string;
        }[];
        foregroundColor: string;
        backgroundColor: string;
    } | {
        tag: "ElmJsonError";
        error: string;
    } | {
        tag: "ClientError";
        message: string;
    };
}, unknown>;
export type WebSocketToClientMessage = ReturnType<typeof WebSocketToClientMessage>;
export declare const WebSocketToClientMessage: Decode.Decoder<{
    tag: "FocusedTabAcknowledged";
} | {
    tag: "OpenEditorFailed";
    error: {
        tag: "EnvNotSet";
    } | {
        tag: "CommandFailed";
        message: string;
    };
} | {
    tag: "StatusChanged";
    status: {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        tag: "AlreadyUpToDate";
    } | {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        tag: "Busy";
    } | {
        compilationMode?: unknown;
        browserUiPosition?: unknown;
        tag: "CompileError";
        openErrorOverlay: boolean;
        errors: {
            location?: {
                file?: unknown;
                tag: "FileOnly";
            } | {
                file?: unknown;
                tag: "FileWithLineAndColumn";
                line: number;
                column: number;
            } | {
                tag: "Target";
                targetName: string;
            } | undefined;
            title: string;
            htmlContent: string;
        }[];
        foregroundColor: string;
        backgroundColor: string;
    } | {
        tag: "ElmJsonError";
        error: string;
    } | {
        tag: "ClientError";
        message: string;
    };
} | {
    compilationMode?: unknown;
    browserUiPosition?: unknown;
    tag: "SuccessfullyCompiled";
    code: string;
    elmCompiledTimestamp: number;
} | {
    tag: "SuccessfullyCompiledButRecordFieldsChanged";
}, unknown>;
export type WebSocketToServerMessage = ReturnType<typeof WebSocketToServerMessage>;
export declare const WebSocketToServerMessage: Decode.Decoder<{
    compilationMode?: unknown;
    tag: "ChangedCompilationMode";
} | {
    browserUiPosition?: unknown;
    tag: "ChangedBrowserUiPosition";
} | {
    tag: "ChangedOpenErrorOverlay";
    openErrorOverlay: boolean;
} | {
    tag: "FocusedTab";
} | {
    file?: unknown;
    tag: "PressedOpenEditor";
    line: number;
    column: number;
}, unknown>;
export declare function encodeWebSocketToClientMessage(message: WebSocketToClientMessage): string;
export declare function decodeWebSocketToClientMessage(message: string): WebSocketToClientMessage;
export {};
