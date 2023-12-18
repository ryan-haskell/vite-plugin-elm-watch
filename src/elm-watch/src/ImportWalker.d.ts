import { NonEmptyArray } from "./NonEmptyArray";
import { InputPath, SourceDirectory } from "./Types";
export type WalkImportsResult = WalkImportsError | {
    tag: "Success";
    allRelatedElmFilePaths: Set<string>;
};
export type WalkImportsError = {
    tag: "ImportWalkerFileSystemError";
    error: Error & {
        code?: string;
    };
    relatedElmFilePathsUntilError: Set<string>;
};
export declare function walkImports(sourceDirectories: NonEmptyArray<SourceDirectory>, inputPaths: NonEmptyArray<InputPath>): WalkImportsResult;
