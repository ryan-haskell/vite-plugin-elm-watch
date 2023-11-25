export declare function runTeaProgram<Mutable, Msg, Model, Cmd, Result>(options: {
    initMutable: (dispatch: (msg: Msg) => void, resolvePromise: (result: Result) => void, rejectPromise: (error: Error) => void) => Mutable;
    init: [Model, Array<Cmd>];
    update: (msg: Msg, model: Model) => [Model, Array<Cmd>];
    runCmd: (cmd: Cmd, mutable: Mutable, dispatch: (msg: Msg) => void, resolvePromise: (result: Result) => void, rejectPromise: (error: Error) => void) => void;
}): Promise<Result>;
