type __ELM_WATCH = {
    MOCKED_TIMINGS: boolean;
    WEBSOCKET_TIMEOUT: number;
    RELOAD_STATUSES: Record<string, ReloadStatus>;
    RELOAD_PAGE: (message: string | undefined) => void;
    ON_INIT: () => void;
    ON_RENDER: (targetName: string) => void;
    ON_REACHED_IDLE_STATE: (reason: ReachedIdleStateReason) => void;
    KILL_MATCHING: (targetName: RegExp) => Promise<void>;
    DISCONNECT: (targetName: RegExp) => void;
    LOG_DEBUG: typeof console.debug;
};
declare global {
    interface Window {
        Elm?: Record<`${UppercaseLetter}${string}`, ElmModule>;
        __ELM_WATCH: __ELM_WATCH;
    }
}
export type UppercaseLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";
export type ElmModule = {
    init: (options?: {
        node?: Element;
        flags?: unknown;
    }) => {
        ports?: Record<string, {
            subscribe?: (value: unknown) => void;
            send?: (value: unknown) => void;
        }>;
    };
    [key: `${UppercaseLetter}${string}`]: ElmModule;
};
type ReloadStatus = {
    tag: "MightWantToReload";
} | {
    tag: "NoReloadWanted";
} | {
    tag: "ReloadRequested";
    reasons: Array<string>;
};
declare let __ELM_WATCH: __ELM_WATCH;
export type ReachedIdleStateReason = "AlreadyUpToDate" | "ClientError" | "CompileError" | "ElmJsonError" | "EvalErrored" | "EvalSucceeded" | "OpenEditorFailed" | "ReloadTrouble";
export {};
