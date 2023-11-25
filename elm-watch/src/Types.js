import * as Decode from "tiny-decoders";
export const AbsolutePath = Decode.fieldsAuto({
    tag: () => "AbsolutePath",
    absolutePath: Decode.string,
});
export const CompilationMode = Decode.stringUnion({
    debug: null,
    standard: null,
    optimize: null,
});
export const BrowserUiPosition = Decode.stringUnion({
    TopLeft: null,
    TopRight: null,
    BottomLeft: null,
    BottomRight: null,
});
export function equalsInputPath(elmFile, inputPath) {
    return (inputPath.theInputPath.absolutePath === elmFile.absolutePath ||
        inputPath.realpath.absolutePath === elmFile.absolutePath);
}
