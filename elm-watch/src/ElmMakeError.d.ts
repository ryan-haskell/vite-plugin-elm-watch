import * as Decode from "tiny-decoders";
export type Color = ReturnType<typeof Color>;
declare const Color: Decode.Decoder<"red" | "RED" | "magenta" | "MAGENTA" | "yellow" | "YELLOW" | "green" | "GREEN" | "cyan" | "CYAN" | "blue" | "BLUE" | "black" | "BLACK" | "white" | "WHITE", unknown>;
export type MessageChunk = ReturnType<typeof MessageChunk>;
declare const MessageChunk: Decode.Decoder<{
    tag: "UnstyledText";
    string: string;
} | {
    color?: "red" | "RED" | "magenta" | "MAGENTA" | "yellow" | "YELLOW" | "green" | "GREEN" | "cyan" | "CYAN" | "blue" | "BLUE" | "black" | "BLACK" | "white" | "WHITE" | undefined;
    string: string;
    tag: "StyledText";
    bold: boolean;
    underline: boolean;
}, unknown>;
export type Problem = ReturnType<typeof Problem>;
declare const Problem: Decode.Decoder<{
    message: ({
        tag: "UnstyledText";
        string: string;
    } | {
        color?: "red" | "RED" | "magenta" | "MAGENTA" | "yellow" | "YELLOW" | "green" | "GREEN" | "cyan" | "CYAN" | "blue" | "BLUE" | "black" | "BLACK" | "white" | "WHITE" | undefined;
        string: string;
        tag: "StyledText";
        bold: boolean;
        underline: boolean;
    })[];
    title: string;
    region: {
        end: {
            line: number;
            column: number;
        };
        start: {
            line: number;
            column: number;
        };
    };
}, unknown>;
export type GeneralError = ReturnType<typeof GeneralError>;
declare const GeneralError: Decode.Decoder<{
    tag: "GeneralError";
    message: ({
        tag: "UnstyledText";
        string: string;
    } | {
        color?: "red" | "RED" | "magenta" | "MAGENTA" | "yellow" | "YELLOW" | "green" | "GREEN" | "cyan" | "CYAN" | "blue" | "BLUE" | "black" | "BLACK" | "white" | "WHITE" | undefined;
        string: string;
        tag: "StyledText";
        bold: boolean;
        underline: boolean;
    })[];
    title: string;
    path: {
        tag: "NoPath";
    } | {
        tag: "elm.json";
    };
}, unknown>;
export type ElmMakeError = ReturnType<typeof ElmMakeError>;
export declare const ElmMakeError: Decode.Decoder<{
    tag: "GeneralError";
    message: ({
        tag: "UnstyledText";
        string: string;
    } | {
        color?: "red" | "RED" | "magenta" | "MAGENTA" | "yellow" | "YELLOW" | "green" | "GREEN" | "cyan" | "CYAN" | "blue" | "BLUE" | "black" | "BLACK" | "white" | "WHITE" | undefined;
        string: string;
        tag: "StyledText";
        bold: boolean;
        underline: boolean;
    })[];
    title: string;
    path: {
        tag: "NoPath";
    } | {
        tag: "elm.json";
    };
} | {
    errors?: unknown;
    tag: "CompileErrors";
}, unknown>;
export {};
