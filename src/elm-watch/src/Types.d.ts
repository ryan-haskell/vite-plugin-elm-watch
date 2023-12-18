import * as Decode from "tiny-decoders";
export type AbsolutePath = ReturnType<typeof AbsolutePath>;
export declare const AbsolutePath: Decode.Decoder<{
    tag: "AbsolutePath";
    absolutePath: string;
}, unknown>;
export type Cwd = {
    tag: "Cwd";
    path: AbsolutePath;
};
export type RunMode = "hot" | "make";
export type CompilationMode = ReturnType<typeof CompilationMode>;
export declare const CompilationMode: Decode.Decoder<"debug" | "standard" | "optimize", unknown>;
export type CompilationModeWithProxy = CompilationMode | "proxy";
export type BrowserUiPosition = ReturnType<typeof BrowserUiPosition>;
export declare const BrowserUiPosition: Decode.Decoder<"TopLeft" | "TopRight" | "BottomLeft" | "BottomRight", unknown>;
export type ElmWatchJsonPath = {
    tag: "ElmWatchJsonPath";
    theElmWatchJsonPath: AbsolutePath;
};
export type ElmJsonPath = {
    tag: "ElmJsonPath";
    theElmJsonPath: AbsolutePath;
};
export type ElmWatchStuffDir = {
    tag: "ElmWatchStuffDir";
    theElmWatchStuffDir: AbsolutePath;
};
export type ElmWatchStuffJsonPath = {
    tag: "ElmWatchStuffJsonPath";
    theElmWatchStuffJsonPath: AbsolutePath;
};
export type SourceDirectory = {
    tag: "SourceDirectory";
    theSourceDirectory: AbsolutePath;
};
export type InputPath = {
    tag: "InputPath";
    theInputPath: AbsolutePath;
    originalString: string;
    realpath: AbsolutePath;
};
export type UncheckedInputPath = {
    tag: "UncheckedInputPath";
    theUncheckedInputPath: AbsolutePath;
    originalString: string;
};
export type OutputPath = {
    tag: "OutputPath";
    theOutputPath: AbsolutePath;
    temporaryOutputPath: AbsolutePath;
    originalString: string;
    targetName: string;
};
export type ElmWatchNodeScriptPath = {
    tag: "ElmWatchNodeScriptPath";
    theElmWatchNodeScriptFileUrl: string;
};
export type CliArg = {
    tag: "CliArg";
    theArg: string;
};
export type WriteOutputErrorReasonForWriting = "InjectWebSocketClient" | "Postprocess";
export type GetNow = () => Date;
export declare function equalsInputPath(elmFile: AbsolutePath, inputPath: InputPath): boolean;
