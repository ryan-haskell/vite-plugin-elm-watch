import * as fs from "fs";
import * as path from "path";
import { elmWatchCli } from "../src";
import { makeLogger } from "../src/Logger";
import { badElmBinEnv, clean, CursorWriteStream, logDebug, MemoryWriteStream, rimraf, rm, SilentReadStream, TEST_ENV, wait, } from "./Helpers";
const CONTAINER_ID = "elm-watch";
export const FIXTURES_DIR = path.join(__dirname, "fixtures", "hot");
let watcher = undefined;
const hotKillManager = { kill: undefined };
export async function cleanupAfterEachTest() {
    const { currentTestName } = expect.getState();
    if (window.__ELM_WATCH?.KILL_MATCHING !== undefined) {
        // The idea is that we need no logging here – it’ll just result in double
        // logging since there will most likely be a running server as well.
        await window.__ELM_WATCH.KILL_MATCHING(/^/);
    }
    if (watcher !== undefined) {
        // eslint-disable-next-line no-console
        console.error("cleanupAfterEachTest: watcher never closed by itself – closing now. Test:", currentTestName);
        watcher.close();
        watcher = undefined;
    }
    if (hotKillManager.kill !== undefined) {
        // eslint-disable-next-line no-console
        console.error("cleanupAfterEachTest: elm-watch never finished – killing. Test:", currentTestName);
        await hotKillManager.kill();
    }
    document.getElementById(CONTAINER_ID)?.remove();
    window.history.replaceState(null, "", "/");
    delete window.__ELM_WATCH;
}
let bodyCounter = 0;
export async function run({ fixture, scripts, args = [], init, onIdle, expandUiImmediately = false, isTTY = true, bin, env, keepBuild = false, keepElmStuffJson = false, clearElmStuff = false, cwd = ".", includeProxyReloads = false, simulateHttpCacheOnReload = false, stdin = new SilentReadStream(), }) {
    // eslint-disable-next-line no-console
    console.warn = () => {
        // Disable Elm’s “Compiled in DEV mode” logs.
    };
    const dir = path.join(FIXTURES_DIR, fixture);
    const build = path.join(dir, "build");
    const absoluteScripts = scripts.map((script) => path.join(build, script));
    const elmStuff = path.join(dir, "elm-stuff");
    const elmWatchStuff = path.join(elmStuff, "elm-watch", "stuff.json");
    if (!keepBuild) {
        await rimraf(build);
        fs.mkdirSync(build, { recursive: true });
    }
    if (!keepElmStuffJson) {
        rm(elmWatchStuff);
    }
    if (clearElmStuff) {
        await rimraf(elmStuff);
    }
    const stdout = new CursorWriteStream();
    const stderr = new MemoryWriteStream();
    stdout.isTTY = isTTY;
    stderr.isTTY = isTTY;
    const bodyIndex = bodyCounter + 2; // head + original body
    const body = document.createElement("body");
    const outerDiv = document.createElement("div");
    body.append(outerDiv);
    document.documentElement.append(body);
    bodyCounter++;
    const numberedScript = (script, loads) => script.replace(/\.(\w+)$/, `.${bodyIndex}.${loads}.$1`);
    const browserConsole = [];
    const renders = [];
    let loads = 0;
    await new Promise((resolve, reject) => {
        const loadBuiltFiles = () => {
            loads++;
            delete window.Elm;
            window.__ELM_WATCH = {};
            setBasicElmWatchProperties();
            (async () => {
                for (const script of absoluteScripts) {
                    // Copying the script does a couple of things:
                    // - Avoiding require/import cache.
                    // - Makes it easier to debug the tests since one can see all the outputs through time.
                    // - Lets us make a few replacements for Jest.
                    const newScript = numberedScript(script, loads);
                    const content = loads > 2 && simulateHttpCacheOnReload
                        ? fs.readFileSync(numberedScript(script, loads - 1), "utf8")
                        : fs
                            .readFileSync(script, "utf8")
                            .replace(/\(this\)\);\s*$/, "(window));")
                            .replace(/^(\s*var bodyNode) = .+;/m, `$1 = document.documentElement.children[${bodyIndex}];`);
                    fs.writeFileSync(newScript, content);
                    await import(newScript);
                }
            })()
                .then(() => {
                if (expandUiImmediately) {
                    expandUi();
                }
                if (loads > 1) {
                    const innerDiv = document.createElement("div");
                    outerDiv.replaceChildren(innerDiv);
                    body.replaceChildren(outerDiv);
                    try {
                        init(innerDiv);
                    }
                    catch (unknownError) {
                        const isElmWatchProxyError = typeof unknownError === "object" &&
                            unknownError !== null &&
                            unknownError.elmWatchProxy ===
                                true;
                        if (!isElmWatchProxyError || absoluteScripts.length === 1) {
                            throw unknownError;
                        }
                    }
                }
            })
                .catch(reject);
        };
        window.__ELM_WATCH = {};
        window.__ELM_WATCH.MOCKED_TIMINGS = true;
        window.__ELM_WATCH.RELOAD_PAGE = (message) => {
            if (message !== undefined) {
                browserConsole.push(message);
            }
            else if (includeProxyReloads) {
                browserConsole.push("Proxy file reload!");
            }
            window.__ELM_WATCH
                .KILL_MATCHING(/^/)
                .then(() => {
                loadBuiltFiles();
            })
                .catch(reject);
        };
        window.__ELM_WATCH.ON_RENDER = (targetName) => {
            withShadowRoot((shadowRoot) => {
                const element = shadowRoot.lastElementChild;
                const text = element instanceof Node
                    ? Array.from(element.childNodes, getTextContent)
                        .join(`\n${"-".repeat(80)}\n`)
                        .replace(/(ws:\/\/localhost):\d{5}/g, "$1:59123")
                    : `#${CONTAINER_ID} not found in:\n${document.documentElement.outerHTML} for ${args.join(", ")}. Target: ${targetName}`;
                renders.push(text);
            });
        };
        const fullEnv = bin === undefined
            ? {
                ...process.env,
                ...TEST_ENV,
                ...env,
            }
            : {
                ...badElmBinEnv(path.join(dir, "bad-bin", bin)),
                ...env,
            };
        window.__ELM_WATCH.LOG_DEBUG = makeLogger({
            env: {},
            getNow: () => new Date(),
            stdin: process.stdin,
            stdout: process.stdout,
            stderr: process.stderr,
            logDebug: (message) => {
                logDebug(`Browser: ${message}`);
            },
        }).debug;
        let idle = 0;
        window.__ELM_WATCH.ON_REACHED_IDLE_STATE = (reason) => {
            idle++;
            // So that another idle state can’t change the previous’ number while it’s waiting.
            const localIdle = idle;
            const actualMain = body.querySelector("main");
            const fallbackMain = document.createElement("main");
            fallbackMain.textContent = "No `main` element found.";
            const main = actualMain ?? fallbackMain;
            // Wait for logs to settle. This file is pretty slow to run through
            // anyway, so this wait is just a drop in the ocean.
            wait(100)
                .then(() => onIdle({ idle: localIdle, div: outerDiv, main, body, reason, stdout }))
                .then((result) => {
                switch (result) {
                    case "KeepGoing":
                        return;
                    case "Stop":
                        return Promise.all([
                            window.__ELM_WATCH.KILL_MATCHING(/^/),
                            hotKillManager.kill === undefined
                                ? undefined
                                : hotKillManager.kill(),
                        ]);
                }
            })
                .catch(reject);
        };
        const basic = { ...window.__ELM_WATCH };
        const setBasicElmWatchProperties = () => {
            Object.assign(window.__ELM_WATCH, basic);
        };
        if (keepBuild) {
            loadBuiltFiles();
        }
        else {
            watcher = fs.watch(build, () => {
                if (absoluteScripts.every(fs.existsSync)) {
                    watcher?.close();
                    watcher = undefined;
                    loadBuiltFiles();
                }
            });
            watcher.on("error", reject);
        }
        elmWatchCli(["hot", ...args], {
            cwd: path.join(dir, cwd),
            env: fullEnv,
            stdin,
            stdout,
            stderr,
            logDebug,
            hotKillManager,
        })
            .then(resolve)
            .catch(reject);
    });
    expect(stderr.content).toBe("");
    return {
        terminal: clean(stdout.getOutput()),
        browserConsole: browserConsole.join("\n\n"),
        renders: clean(renders.join(`\n${"=".repeat(80)}\n`)),
        div: outerDiv,
    };
}
export function runHotReload({ fixture = "hot-reload", name, programType, compilationMode, init, extraScripts = [], extraElmWatchStuffJson = {}, ...sharedOptions }) {
    const dir = path.join(FIXTURES_DIR, fixture);
    const src = path.join(dir, "src");
    const elmWatchStuffJson = {
        port: 58888,
        targets: {
            [name]: {
                compilationMode,
                browserUiPosition: "BottomLeft",
                openErrorOverlay: false,
            },
            ...extraElmWatchStuffJson,
        },
    };
    let lastContent = "";
    const write = (n) => {
        const content = fs.readFileSync(path.join(src, `${name}${n}.elm`), "utf8");
        lastContent = content
            .replace(`module ${name}${n}`, `module ${name}`)
            .replace(/^(main =\s*)\w+$/m, `$1main${programType}`);
        fs.writeFileSync(path.join(src, `${name}.elm`), lastContent);
    };
    const replace = (f) => {
        lastContent = f(lastContent);
        fs.writeFileSync(path.join(src, `${name}.elm`), lastContent);
    };
    const removeInput = () => {
        fs.unlinkSync(path.join(src, `${name}.elm`));
    };
    let app;
    const lastValueFromElm = { value: undefined };
    const sendToElm = (value) => {
        const send = app?.ports?.fromJs?.send;
        if (send === undefined) {
            throw new Error("Failed to find 'fromJs' send port.");
        }
        send(value);
    };
    return {
        replace,
        write,
        removeInput,
        sendToElm,
        lastValueFromElm,
        go: (onIdle) => {
            const elmWatchStuffJsonPath = path.join(dir, "elm-stuff", "elm-watch", "stuff.json");
            fs.mkdirSync(path.dirname(elmWatchStuffJsonPath), { recursive: true });
            fs.writeFileSync(elmWatchStuffJsonPath, JSON.stringify(elmWatchStuffJson));
            write(1);
            return run({
                fixture,
                args: [name],
                scripts: [`${name}.js`, ...extraScripts],
                keepElmStuffJson: true,
                ...sharedOptions,
                init: init === undefined
                    ? (node) => {
                        app = window.Elm?.[name]?.init({ node });
                        if (app?.ports !== undefined) {
                            const subscribe = app.ports.toJs?.subscribe;
                            if (subscribe === undefined) {
                                throw new Error("Failed to find 'toJs' subscribe port.");
                            }
                            subscribe((value) => {
                                lastValueFromElm.value = value;
                            });
                        }
                    }
                    : (node) => {
                        app = init(node);
                    },
                onIdle,
            });
        },
    };
}
function withShadowRoot(f) {
    const shadowRoot = document.getElementById(CONTAINER_ID)?.shadowRoot ?? undefined;
    if (shadowRoot === undefined) {
        throw new Error(`Couldn’t find #${CONTAINER_ID}!`);
    }
    else {
        f(shadowRoot);
    }
}
export function expandUi(targetName) {
    expandUiHelper(true, targetName);
}
export function collapseUi(targetName) {
    expandUiHelper(false, targetName);
}
function expandUiHelper(wantExpanded, targetName) {
    withShadowRoot((shadowRoot) => {
        const button = shadowRoot?.querySelector(`${targetName === undefined
            ? "[data-target]"
            : `[data-target="${targetName}"]`} button[aria-expanded]`);
        if (button instanceof HTMLElement) {
            if (button.getAttribute("aria-expanded") !== wantExpanded.toString()) {
                button.click();
            }
        }
        else {
            throw new Error(`Could not button for expanding UI.`);
        }
    });
}
export function showErrors(targetName) {
    withShadowRoot((shadowRoot) => {
        const button = shadowRoot?.querySelector(`${targetName === undefined
            ? "[data-target]"
            : `[data-target="${targetName}"]`} [data-test-id="ShowErrorOverlayButton"]`);
        if (button instanceof HTMLElement) {
            button.click();
        }
        else {
            throw new Error(`Could not button for showing errors.`);
        }
    });
}
export function hideErrors(targetName) {
    withShadowRoot((shadowRoot) => {
        const button = shadowRoot?.querySelector(`${targetName === undefined
            ? "[data-target]"
            : `[data-target="${targetName}"]`} [data-test-id="HideErrorOverlayButton"]`);
        if (button instanceof HTMLElement) {
            button.click();
        }
        else {
            throw new Error(`Could not button for hiding errors.`);
        }
    });
}
export function closeOverlay() {
    withShadowRoot((shadowRoot) => {
        const button = shadowRoot?.querySelector(`[data-test-id="OverlayCloseButton"]`);
        if (button instanceof HTMLElement) {
            button.click();
        }
        else {
            throw new Error(`Could not button for closing overlay.`);
        }
    });
}
export function getOverlay() {
    let result = "(Overlay not found)";
    withShadowRoot((shadowRoot) => {
        const overlay = shadowRoot?.querySelector(`[data-test-id="Overlay"]`);
        if (overlay instanceof HTMLElement) {
            const children = Array.from(overlay.children, (child, index) => {
                const clone = child.cloneNode(true);
                clone.id = index.toString();
                for (const element of clone.querySelectorAll("[class]")) {
                    element.removeAttribute("class");
                }
                return clone.outerHTML
                    .replace("<summary", "\n<summary")
                    .replace("</summary>", "</summary>\n");
            }).join(`\n${"-".repeat(80)}\n`);
            result = `<overlay ${overlay.hidden ? "hidden" : "visible"} style="${overlay.getAttribute("style") ?? ""}">\n${children}\n</overlay>`;
        }
    });
    return clean(result);
}
export function clickFirstErrorLocation() {
    withShadowRoot((shadowRoot) => {
        const button = shadowRoot?.querySelector(`[data-test-id="Overlay"] button`);
        if (button instanceof HTMLButtonElement) {
            button.click();
        }
        else {
            throw new Error(`Could not find any button in overlay.`);
        }
    });
}
export function moveUi(position) {
    expandUi();
    withShadowRoot((shadowRoot) => {
        const button = shadowRoot?.querySelector(`button[data-position="${position}"]`);
        if (button instanceof HTMLButtonElement) {
            button.click();
        }
        else {
            throw new Error(`Could not find button for ${position}.`);
        }
    });
}
export function switchCompilationMode(compilationMode) {
    expandUi();
    withShadowRoot((shadowRoot) => {
        const radio = shadowRoot?.querySelector(`input[type="radio"][value="${compilationMode}"]`);
        if (radio instanceof HTMLInputElement) {
            radio.click();
        }
        else {
            throw new Error(`Could not find radio button for ${compilationMode}.`);
        }
    });
}
export function assertCompilationMode(compilationMode) {
    expandUi();
    withShadowRoot((shadowRoot) => {
        const radio = shadowRoot?.querySelector(`input[type="radio"]:checked`);
        if (radio instanceof HTMLInputElement) {
            expect(radio.value).toMatchInlineSnapshot(compilationMode);
        }
        else {
            throw new Error(`Could not find a checked radio button (expecting to be ${compilationMode}).`);
        }
    });
}
export function assertDebugDisabled() {
    expandUi();
    withShadowRoot((shadowRoot) => {
        const radio = shadowRoot?.querySelector('input[type="radio"]');
        if (radio instanceof HTMLInputElement) {
            expect(radio.disabled).toMatchInlineSnapshot(`true`);
        }
        else {
            throw new Error(`Could not find any radio button!`);
        }
    });
    collapseUi();
}
export function assertDebugger(body) {
    expect(Array.from(body.querySelectorAll("svg"), (element) => element.localName)).toMatchInlineSnapshot(`
    [
      svg,
    ]
  `);
}
function getTextContent(element) {
    return Array.from(walkTextNodes(element))
        .join("")
        .trim()
        .replace(/\n /g, "\n")
        .replace(/[\n·↑↓←→↖↗↙↘]+/g, (match) => {
        const chars = match.replace(/\s/g, "");
        return chars === ""
            ? match
            : `\n${chars.slice(0, 2)}\n${chars.slice(2)}\n`;
    });
}
function* walkTextNodes(element) {
    if (shouldAddNewline(element)) {
        yield "\n";
    }
    for (const node of element.childNodes) {
        if (node instanceof Text) {
            yield " ";
            yield node.data.trim();
        }
        else if (node instanceof HTMLInputElement && node.type === "radio") {
            yield (node.checked ? "◉" : "◯") + (node.disabled ? " (disabled)" : "");
        }
        else if (node instanceof HTMLButtonElement) {
            const textContent = (node.textContent ?? "").trim();
            if (textContent.length === 1) {
                yield textContent;
            }
            else {
                yield `\n[${textContent}]`;
            }
        }
        else if (node instanceof HTMLAnchorElement) {
            const textContent = (node.textContent ?? "").trim();
            yield ` [${textContent}](${node.href})`;
        }
        else {
            yield* walkTextNodes(node);
        }
    }
}
function shouldAddNewline(node) {
    switch (node.nodeName) {
        case "DIV":
        case "DT":
        case "LEGEND":
        case "LABEL":
        case "P":
        case "PRE":
            return true;
        default:
            return false;
    }
}
export function failInit() {
    throw new Error("Expected `init` not to be called!");
}
export function click(element, selector) {
    const target = element.querySelector(selector);
    if (target instanceof HTMLElement) {
        target.click();
    }
    else {
        throw new Error(`Element to click is not considered clickable: ${selector} -> ${target === null ? "not found" : target.nodeName}`);
    }
}
