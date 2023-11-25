import * as Decode from "tiny-decoders";
import { NonEmptyArray } from "./NonEmptyArray";
const Color = Decode.stringUnion({
    red: null,
    RED: null,
    magenta: null,
    MAGENTA: null,
    yellow: null,
    YELLOW: null,
    green: null,
    GREEN: null,
    cyan: null,
    CYAN: null,
    blue: null,
    BLUE: null,
    black: null,
    BLACK: null,
    white: null,
    WHITE: null,
});
const MessageChunk = Decode.multi({
    string: (string) => ({
        tag: "UnstyledText",
        string,
    }),
    object: Decode.fieldsAuto({
        tag: () => "StyledText",
        bold: Decode.boolean,
        underline: Decode.boolean,
        color: Decode.nullable(Color, undefined),
        string: Decode.string,
    }),
});
// https://github.com/elm/compiler/blob/94715a520f499591ac6901c8c822bc87cd1af24f/compiler/src/Reporting/Error.hs#L201-L204
const Position = Decode.fieldsAuto({
    line: Decode.number,
    column: Decode.number,
});
// https://github.com/elm/compiler/blob/94715a520f499591ac6901c8c822bc87cd1af24f/compiler/src/Reporting/Error.hs#L197-L210
const Region = Decode.fieldsAuto({
    start: Position,
    end: Position,
});
const Problem = Decode.fieldsAuto({
    title: Decode.string,
    region: Region,
    message: Decode.array(MessageChunk),
});
// https://github.com/elm/compiler/blob/94715a520f499591ac6901c8c822bc87cd1af24f/compiler/src/Reporting/Error.hs#L175-L185
const CompileError = Decode.fieldsAuto({
    // https://github.com/elm/compiler/blob/94715a520f499591ac6901c8c822bc87cd1af24f/compiler/src/Reporting/Error.hs#L42
    path: Decode.chain(Decode.string, (string) => ({
        tag: "AbsolutePath",
        absolutePath: string,
    })),
    name: Decode.string,
    problems: NonEmptyArray(Problem),
});
const GeneralError = Decode.fieldsAuto({
    tag: () => "GeneralError",
    // `Nothing` and `Just "elm.json"` are the only values I’ve found in the compiler code base.
    path: Decode.nullable(Decode.chain(Decode.stringUnion({
        "elm.json": null,
    }), (tag) => ({ tag })), { tag: "NoPath" }),
    title: Decode.string,
    message: Decode.array(MessageChunk),
});
export const ElmMakeError = Decode.fieldsUnion("type", {
    error: GeneralError,
    "compile-errors": Decode.fieldsAuto({
        tag: () => "CompileErrors",
        errors: NonEmptyArray(CompileError),
    }),
});
