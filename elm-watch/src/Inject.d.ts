import { Port } from "./Port";
import { BrowserUiPosition, CompilationMode, CompilationModeWithProxy, OutputPath } from "./Types";
export declare function inject(compilationMode: CompilationMode, code: string, elmModulePath: string[]): string;
export declare function proxyFile(outputPath: OutputPath, elmCompiledTimestamp: number, browserUiPosition: BrowserUiPosition, webSocketPort: Port, debug: boolean): string;
export declare function clientCode(outputPath: OutputPath, elmCompiledTimestamp: number, compilationMode: CompilationModeWithProxy, browserUiPosition: BrowserUiPosition, webSocketPort: Port, debug: boolean): string;
export declare function versionedIdentifier(targetName: string, webSocketPort: Port): string;
export declare function getRecordFields(compilationMode: CompilationMode, code: string): Set<string> | undefined;
export declare function recordFieldsChanged(oldSet: Set<string> | undefined, newSet: Set<string> | undefined): boolean;
