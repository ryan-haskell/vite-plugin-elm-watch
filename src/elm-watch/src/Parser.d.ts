import { NonEmptyArray } from "./NonEmptyArray";
export type ModuleName = NonEmptyArray<string>;
type ReadState = {
    tokenizerState: TokenizerState;
    parserState: ParserState;
    importedModules: Array<ModuleName>;
};
export declare const initialReadState: () => ReadState;
export declare function readChar(char: number, readState: ReadState): void;
export declare function isNonImport(readState: ReadState): boolean;
export declare function finalize(readState: ReadState): Array<ModuleName>;
type TokenizerState = {
    tag: "Initial" | "MaybeMultilineComment{" | "MaybeNewChunk" | "MaybeSinglelineComment-" | "MultilineComment-" | "MultilineComment" | "MultilineComment{" | "SinglelineComment";
    chars: Array<number>;
    multilineCommentLevel: number;
};
type ParserState = {
    tag: "Ignore" | "Import" | "NewChunk" | "NonImport" | "StartOfFile";
};
export {};
