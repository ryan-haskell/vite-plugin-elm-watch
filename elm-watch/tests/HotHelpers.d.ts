import { ElmModule, ReachedIdleStateReason, UppercaseLetter } from "../client/client";
import { ElmWatchStuffJsonWritable } from "../src/ElmWatchStuffJson";
import { Env } from "../src/Env";
import { ReadStream } from "../src/Helpers";
import { BrowserUiPosition, CompilationMode } from "../src/Types";
import { CursorWriteStream } from "./Helpers";
export declare const FIXTURES_DIR: string;
export declare function cleanupAfterEachTest(): Promise<void>;
type OnIdle = (params: {
    idle: number;
    div: HTMLDivElement;
    main: HTMLElement;
    body: HTMLBodyElement;
    reason: ReachedIdleStateReason;
    stdout: CursorWriteStream;
}) => OnIdleResult | Promise<OnIdleResult>;
type OnIdleResult = "KeepGoing" | "Stop";
type SharedRunOptions = {
    expandUiImmediately?: boolean;
    isTTY?: boolean;
    bin?: string;
    env?: Env;
    keepBuild?: boolean;
    keepElmStuffJson?: boolean;
    clearElmStuff?: boolean;
    cwd?: string;
    includeProxyReloads?: boolean;
    simulateHttpCacheOnReload?: boolean;
    stdin?: ReadStream;
};
export declare function run({ fixture, scripts, args, init, onIdle, expandUiImmediately, isTTY, bin, env, keepBuild, keepElmStuffJson, clearElmStuff, cwd, includeProxyReloads, simulateHttpCacheOnReload, stdin, }: SharedRunOptions & {
    fixture: string;
    scripts: Array<string>;
    args?: Array<string>;
    init: (node: HTMLDivElement) => void;
    onIdle: OnIdle;
}): Promise<{
    terminal: string;
    browserConsole: string;
    renders: string;
    div: HTMLDivElement;
}>;
export declare function runHotReload({ fixture, name, programType, compilationMode, init, extraScripts, extraElmWatchStuffJson, ...sharedOptions }: SharedRunOptions & {
    fixture?: string;
    name: `${UppercaseLetter}${string}`;
    programType: "Application" | "Document" | "Element" | "Html" | "Sandbox" | "Worker";
    compilationMode: CompilationMode;
    init?: (node: HTMLDivElement) => ReturnType<ElmModule["init"]> | undefined;
    extraScripts?: Array<string>;
    extraElmWatchStuffJson?: ElmWatchStuffJsonWritable["targets"];
}): {
    replace: (f: (fileContent: string) => string) => void;
    write: (n: number) => void;
    removeInput: () => void;
    sendToElm: (value: number) => void;
    lastValueFromElm: {
        value: unknown;
    };
    go: (onIdle: OnIdle) => ReturnType<typeof run>;
};
export declare function expandUi(targetName?: string): void;
export declare function collapseUi(targetName?: string): void;
export declare function showErrors(targetName?: string): void;
export declare function hideErrors(targetName?: string): void;
export declare function closeOverlay(): void;
export declare function getOverlay(): string;
export declare function clickFirstErrorLocation(): void;
export declare function moveUi(position: BrowserUiPosition): void;
export declare function switchCompilationMode(compilationMode: CompilationMode): void;
export declare function assertCompilationMode(compilationMode: CompilationMode): void;
export declare function assertDebugDisabled(): void;
export declare function assertDebugger(body: HTMLBodyElement): void;
export declare function failInit(): never;
export declare function click(element: HTMLElement, selector: string): void;
export {};
