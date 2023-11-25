export async function runTeaProgram(options) {
    return new Promise((resolve, reject) => {
        const [initialModel, initialCmds] = options.init;
        let model = initialModel;
        const msgQueue = [];
        let killed = false;
        const dispatch = (dispatchedMsg) => {
            // istanbul ignore if
            if (killed) {
                return;
            }
            const alreadyRunning = msgQueue.length > 0;
            msgQueue.push(dispatchedMsg);
            if (alreadyRunning) {
                return;
            }
            for (const msg of msgQueue) {
                const [newModel, cmds] = options.update(msg, model);
                model = newModel;
                runCmds(cmds);
            }
            msgQueue.length = 0;
        };
        const runCmds = (cmds) => {
            for (const cmd of cmds) {
                options.runCmd(cmd, mutable, dispatch, (result) => {
                    cmds.length = 0;
                    killed = true;
                    resolve(result);
                }, 
                // istanbul ignore next
                (error) => {
                    cmds.length = 0;
                    killed = true;
                    reject(error);
                });
                // istanbul ignore next
                if (killed) {
                    break;
                }
            }
        };
        const mutable = options.initMutable(dispatch, (result) => {
            killed = true;
            resolve(result);
        }, 
        // istanbul ignore next
        (error) => {
            killed = true;
            reject(error);
        });
        runCmds(initialCmds);
    });
}
