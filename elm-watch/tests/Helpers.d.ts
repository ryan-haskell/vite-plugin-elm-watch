/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="jest" />
/// <reference types="node" resolution-mode="require"/>
import * as http from "http";
import * as stream from "stream";
import { Env } from "../src/Env";
import { ReadStream, WriteStream } from "../src/Helpers";
export declare const logDebug: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
};
export declare function readFile(filePath: string): string;
export declare const TEST_ENV: {
    [x: number]: string | undefined;
};
export declare function badElmBinEnv(dir: string): Env;
export declare function prependPATH(folder: string): string;
export declare function waitOneFrame(): Promise<void>;
export declare function wait(ms: number): Promise<void>;
export declare function touch(filePath: string): void;
export declare function rm(filePath: string): void;
export declare function rimraf(filePath: string): Promise<void>;
export declare function rmSymlink(symlink: string): void;
export declare class SilentReadStream extends stream.Readable implements ReadStream {
    isTTY: boolean;
    isRaw: boolean;
    data: Array<string>;
    _read(): void;
    setRawMode(isRaw: boolean): void;
}
export declare class TerminalColorReadStream extends SilentReadStream implements ReadStream {
    on<T>(eventName: string | symbol, listener: (...args: Array<T>) => void): this;
}
export declare class CtrlCReadStream extends SilentReadStream implements ReadStream {
    ctrlC(): void;
}
export declare class MemoryWriteStream extends stream.Writable implements WriteStream {
    isTTY: boolean;
    columns: undefined;
    content: string;
    _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
}
export declare class CursorWriteStream extends stream.Writable implements WriteStream {
    isTTY: boolean;
    columns: number;
    private lines;
    private cursor;
    _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
    getOutput(): string;
    resize(columns: number): void;
}
export declare function clean(string: string): string;
export declare function assertExitCode(expectedExitCode: number, actualExitCode: number, stdout: string, stderr: string): void;
export declare const stringSnapshotSerializer: {
    test: (value: unknown) => boolean;
    print: StringConstructor;
};
export declare const describeExceptWindows: jest.Describe;
export declare const testExceptWindows: jest.It;
export declare function httpGet(urlString: string, options?: http.RequestOptions): Promise<string>;
