import os from 'os'
import fs from 'fs'
import path from 'path'
import { minify } from 'terser'
import { make } from '../elm-watch/src/SpawnElm.js'
import { inject } from '../elm-watch/src/Inject.js'
import { walkImports } from '../elm-watch/src/ImportWalker.js'
import * as ElmErrorJson from './elm-error-json.js'
import { findClosest } from '../elm-watch/src/PathHelpers.js'
import { readAndParse, getSourceDirectories } from '../elm-watch/src/ElmJson.js'
import launchEditor from 'launch-editor'

/**
 * @type {{ [filepath: string]: Set<string> }}
 */
let elmEntrypointObject = {}


/**
 * @param {import(".").Options} opts
 * @returns {import("vite").Plugin}
 */
export default function elmWatchPlugin(opts = {}) {
  // Handle arguments and defaults
  let mode = opts.mode === undefined ? 'auto' : opts.mode
  let isBodyPatchEnabled = typeof opts.isBodyPatchEnabled === 'boolean'
    ? opts.isBodyPatchEnabled
    : false
  let isReactComponent = opts.output === 'react'

  /**
   * @type {import("vite").ViteDevServer | undefined}
   */
  let server = undefined

  /**
   * @type {Record<string, string | null>}
   */
  let lastErrorSent = {}

  /**
   * @type {Record<string, string>}
   */
  let lastSuccessfulCompiledJs = {}

  return {
    name: 'elm-watch',
    configureServer(server_) {
      server = server_

      server.ws.on('elm:client-ready', ({ id }) => {
        let error = lastErrorSent[id]
        if (error) {
          server_.ws.send('elm:error', {
            id,
            error: ElmErrorJson.toColoredHtmlOutput(error)
          })
        }
      })
      server.ws.on('elm:open-editor', ({ filepath }) => {
        launchEditor(filepath)
      })
    },

    // TODO: Think about file deletion! 🚨
    async handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.elm')) {
        return Object.entries(elmEntrypointObject)
          .filter(([_id, set]) => set.has(ctx.file))
          .map(([id]) => ctx.server.moduleGraph.getModuleById(id))
      }
    },

    async load(id) {
      if (id.endsWith('.elm')) {
        let inDevelopment = server !== undefined

        // Set Elm Watch "compilationMode"
        let compilationMode = mode
        let shouldMinify = false
        if (mode === 'minify') {
          compilationMode = 'optimize'
          shouldMinify = true
        } else if (mode === 'auto') {
          if (inDevelopment) {
            compilationMode = 'debug'
          } else {
            compilationMode = 'optimize'
            shouldMinify = true
          }
        }

        let tmpDir = os.tmpdir()
        let tempOutputFilepath = path.join(tmpDir, 'out.js')

        if (isReactComponent && compilationMode === 'debug') {
          compilationMode = 'standard'
          // TODO: Right now, React freaks out when unmounting .elm components
          // that are using the debugger. You can test this by going from
          // Counter.elm to Counter.tsx- the page will break and react will fail
          // to remove a child node.
          //
          // Temporary fix is to disable "debug" mode when running in react mode
          // Ultimately, I would like to support debug mode though!
          //
          console.warn('Debugger disabled for React development (enabling breaks HMR)!')
        }

        let elmMake = make({
          elmJsonPath: {
            tag: 'ElmJsonPath',
            theElmJsonPath: {
              tag: 'AbsolutePath',
              absolutePath: path.join(process.cwd(), 'elm.json')
            }
          },
          compilationMode,
          inputs: [
            { tag: 'InputPath', theInputPath: { tag: "AbsolutePath", absolutePath: id } }
          ],
          outputPath: {
            tag: 'OutputPath',
            theOutputPath: { tag: 'AbsolutePath', absolutePath: tempOutputFilepath }
          },
          env: process.env,
          getNow: () => new Date()
        })

        let inputPath = toInputPath(id)

        let walkResultPromise = Promise.resolve().then(() => {
          let sourceDirectories = findSourceDirectoriesFor(id)
          return walkImports(sourceDirectories, [inputPath])
        })

        let [makeResult, walkResult] = await Promise.all([
          elmMake.promise,
          walkResultPromise
        ])

        switch (walkResult.tag) {
          case 'Success':
            elmEntrypointObject[id] = walkResult.allRelatedElmFilePaths
            break
          case 'ImportWalkerFileSystemError':
            elmEntrypointObject[id] = walkResult.relatedElmFilePathsUntilError
            break
        }

        switch (makeResult.tag) {
          case 'Success':
            let compiledElmJs = fs.readFileSync(tempOutputFilepath, { encoding: 'utf-8' })
            lastErrorSent[id] = null

            if (server) {
              server.ws.send('elm:success', { id })
            }

            // Something like [ "Main" ] or [ "Components", "Counter" ], etc
            let elmModulePath = []
            try {
              elmModulePath = id.substring(
                findSourceDirectoriesFor(id)[0].theSourceDirectory.absolutePath.length + 1,
                id.length - '.elm'.length
              ).split('/')
            } catch (_) { }

            let transformedElmJs = compiledElmJs
            if (inDevelopment && !shouldMinify) {
              transformedElmJs = inject(compilationMode, transformedElmJs, elmModulePath)
            }
            transformedElmJs = patchUnmount(transformedElmJs)
            if (isBodyPatchEnabled) {
              transformedElmJs = patchBodyNode(transformedElmJs)
            }
            if (shouldMinify) {
              transformedElmJs = await toMinifiedElmCode(transformedElmJs)
            }


            if (isReactComponent) {

              let moduleName = elmModulePath.slice(-1)[0] || 'Main'
              lastSuccessfulCompiledJs[id] = [
                reactComponentCode(moduleName),
                `const program = ({ run () { if (import.meta.hot) { ${initElmWatchWindowVarCode}; } ${transformedElmJs}; ${denestCode(elmModulePath)}; return denest(this.Elm) } }).run(); export { program as __program }; ${hmrClientCode(id, true, true)}`
              ].join('\n')
            } else {
              lastSuccessfulCompiledJs[id] = `export default ({ run () { if (import.meta.hot) { ${initElmWatchWindowVarCode}; } ${transformedElmJs}; ${denestCode(elmModulePath)}; return denest(this.Elm) } }).run(); ${hmrClientCode(id, true, false)}`
            }

            return lastSuccessfulCompiledJs[id]
          case "ElmNotFoundError":
            let error = [
              'Elm could not be found... please try running this command:',
              '',
              '    npm install -D elm',
              '',
              '',
              'More installation options here: https://guide.elm-lang.org/install/elm'
            ].join('\n')

            throw new Error(error)
          case 'ElmMakeError':
            let elmError = makeResult.error
            lastErrorSent[id] = elmError
            if (server) {
              server.ws.send('elm:error', {
                id,
                error: ElmErrorJson.toColoredHtmlOutput(elmError)
              })

              // If possible, maintain the last working version of the
              // Elm application, but with the error overlay on top.
              if (lastSuccessfulCompiledJs[id]) {
                return lastSuccessfulCompiledJs[id]
              } else {
                return `export default { init: () => ({}) }; ${hmrClientCode(id, false, isReactComponent)}; import.meta.hot.accept()`
              }
            } else {
              throw new Error(ElmErrorJson.toColoredTerminalOutput(elmError))
            }
          default:
            throw new Error(JSON.stringify(makeResult, null, 2))
        }
      }
    }
  }
}

/**
 * Makes it easier to work with multiple entrypoints by turning 
 * `Elm.Components.Counter` into `Counter`.
 * 
 * This prevents conflicts for the `Elm` global namespace when
 * importing two or more Elm programs in one place.
 * 
 * This means code changes from:
 * 
 * ```ts
 * -- OLD
 * import Elm from './src/Main.elm'
 * let app = Elm.Main.init(...)
 * 
 * -- NEW
 * import Main from './src/Main.elm'
 * let app = Main.init(...)
 * ```
 * 
 * @param {string[]} elmModulePath 
 * @returns {string}
 */
const denestCode = (elmModulePath = []) => `
const denest = (originalObj) => {
  const elmModulePath = ${JSON.stringify(elmModulePath)}
  let keyPath = [...elmModulePath]
  let obj = originalObj
  while (keyPath.length > 0) {
    let key = keyPath.shift()
    obj = obj[key]
  }
  obj.__elmModulePath = elmModulePath
  return obj
}`

/**
 * Exports a React component that handles mounting for
 * easy swapping of `.jsx` and `.elm` files.
 * 
 * @param {string} moduleName 
 * @returns {string}
 */
const reactComponentCode = (moduleName = 'Main') => `
'use client';
import { createElement, useEffect, useRef } from "react"

const ${moduleName} = (props) => {
  const elmRef = useRef(null)
  const isMounted = useRef(false)

  useEffect(() => {
    if (elmRef.current && !isMounted.current) {
      isMounted.current = true
      let node = elmRef.current
      let app = program.init({
        node,
        flags: { ...props }
      })
      return () => {
        app.unmount()
        isMounted.current = false
      }
    }
  },[])

  return createElement('div', { ref: elmRef })
}

export default ${moduleName}`

/**
 * 
 * @param {string} unminifiedJs 
 * @returns {Promise<string>}
 */
let toMinifiedElmCode = async (unminifiedJs) => {
  // --compress 'pure_funcs="F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9",pure_getters,keep_fargs=false,unsafe_comps,unsafe' })
  const { code: step1 } = await minify(unminifiedJs, { compress: { pure_funcs: 'F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9'.split(','), pure_getters: true, keep_fargs: false, unsafe_comps: true, unsafe: true } })
  // --mangle
  const { code: step2 } = await minify(step1, { mangle: true })
  return step2
}

/** 
 * @param {bool} isBodyPatchEnabled
 * @param {string} code
 * @returns {string}
*/
const patchBodyNode = (code) => {
  return code
    .replaceAll('var bodyNode = _VirtualDom_doc.body', 'var bodyNode = args && args.node || _VirtualDom_doc.body')
    .replaceAll(`_VirtualDom_node('body')`, `_VirtualDom_node(bodyNode.localName)`)
}

/**
 * @param {string} code
 * @returns {string}
*/
const patchUnmount = (code) => {
  return code.replace(
    /^\s*return (Object\.defineProperties\(\s*)?ports \? \{ ports: ports \} : \{\}(;|,[^)]+\);)|^\s*domNode = _VirtualDom_applyPatches\(domNode, currNode, patches, sendToApp\);/gm,
    (_, defineProperties, end) =>
      end !== undefined
        ? `
	function unmount() {
		_Platform_enqueueEffects(managers, _Platform_batch(_List_Nil), _Platform_batch(_List_Nil));
		managers = null;
		model = null;
		stepper = null;
		ports = null;
		if (args && args.node) {
			// TODO: Symbol me
			scope.domNode.replaceWith(args.node);
		} else {
			scope.domNode.remove();
		}
		if (import.meta.hot) {
			const index = import.meta.hot.data.elmApps.indexOf(app);
			if (index !== -1) {
				import.meta.hot.data.elmApps.splice(index, 1);
			}
		}
	}

	var app = ${defineProperties ?? ""}ports ? { ports: ports, unmount: unmount } : { unmount: unmount }${end}
	if (import.meta.hot) {
		import.meta.hot.data.elmApps ??= [];
		import.meta.hot.data.elmApps.push(app);
	}
	return app;
        `.trim()
        : 'domNode = _VirtualDom_applyPatches(domNode, currNode, patches, sendToApp); scope.domNode = domNode;'
  )
}

/** 
 * @param {string} id
 * @returns {import("../elm-watch/src/Types.js").InputPath}
*/
const toInputPath = (id) => ({
  tag: 'InputPath',
  originalString: id.slice(process.cwd() + 1),
  theInputPath: {
    tag: 'AbsolutePath',
    absolutePath: id
  },
  realpath: {
    tag: 'AbsolutePath',
    absolutePath: id
  },
})


const findSourceDirectoriesFor = (entrypointFilepath) => {
  let containingFolder = path.dirname(entrypointFilepath)
  let closestElmJson = findClosest('elm.json', {
    tag: 'AbsolutePath',
    absolutePath: containingFolder
  })
  if (closestElmJson) {
    let elmJsonPath = {
      tag: "ElmJsonPath",
      theElmJsonPath: closestElmJson
    }
    let elmJsonResult = readAndParse(elmJsonPath)

    if (elmJsonResult.tag === 'Parsed') {
      return getSourceDirectories(elmJsonPath, elmJsonResult.elmJson)
    } else {
      // TODO: How should we communicate invalid elm.json files?
      return []
    }
  } else {
    // TODO: Think about how to communicate missing elm.json file
    return []
  }
}

const initElmWatchWindowVarCode = `
let { __ELM_WATCH } = window;
if (typeof __ELM_WATCH !== "object" || __ELM_WATCH === null) {
    __ELM_WATCH = {};
    Object.defineProperty(window, "__ELM_WATCH", { value: __ELM_WATCH });
}
`

const hmrClientCode = (id, wasSuccessful, isReactComponent) => `
if (import.meta.hot) {
  let id = "${id}"
  let wasSuccessful = ${wasSuccessful}

  class ElmErrorOverlay extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
    }

    onContentChanged(html) {
      this.shadowRoot.querySelector('.elm-error').innerHTML = html

      // Adds "Jump to problem" button click listeners
      let buttons = this.shadowRoot.querySelectorAll('button[data-source]')
      for (let btn of buttons) {
        btn.addEventListener('click', () => {
          let filepath = btn.getAttribute('data-source')
          import.meta.hot.send('elm:open-editor', { filepath })
        })
      }
    }

    connectedCallback() {
      this.shadowRoot.innerHTML = \`
        <style>
          /* ATOM DARK */
          :host {
            --elmError__red: #E06C75;
            --elmError__green: #98C379;
            --elmError__yellow: #E5C07B;
            --elmError__blue: #61AFEF;
            --elmError__magenta: #C678DD;
            --elmError__cyan: #56B6C2;
            --elmError__background: #282C34;
            --elmError__foreground: #e6e7eb;
          }
      
          @media (prefers-color-scheme: light) {
            /* ATOM LIGHT */
            :host {
              --elmError__red: #CA1243;
              --elmError__green: #50A14F;
              --elmError__yellow: #C18401;
              --elmError__blue: #4078F2;
              --elmError__magenta: #A626A4;
              --elmError__cyan: #0184BC;
              --elmError__background: #FAFAFA;
              --elmError__foreground: #383A42;
            }
          }

          elm-error-overlay {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          button {
            font-size: inherit;
            padding: 0;
            color: inherit;
            background: none;
            border: 0;
            font-family: inherit;
            cursor: pointer;
            position: relative;
            z-index: 1;
          }
          button:hover {
            opacity: 0.75;
          }
          button:active {
            opacity: 1;
            color: var(--elmError__foreground)
          }
          button:after {
            content: '';
            position: absolute;
            top: -0.33em;
            left: -1em;
            right: -1em;
            bottom: -0.33em;
            z-index: 0;
            border-radius: 1em;
            border: solid 2px;
          }
          .elm-error__background {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.25;
            background: #000;
          }
          .elm-error__parent {    
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          .elm-error {
            position: relative;
            background: var(--elmError__background);
            color: var(--elmError__foreground);
            font-weight: 400;
            font-family: 'Fira Code', Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
            font-variant-ligatures: none;
            font-size: 1rem;
            white-space: nowrap;
            line-height: 1.5;
            border-radius: 0.5rem;
            box-shadow: 0 1rem 1rem rgba(0, 0, 0, 0.125);
            border-top: solid 0.5rem var(--elmError__red);
            max-height: calc(100vh - 2rem);
            overflow: auto;
            max-width: 100%;
            box-sizing: border-box;
          }
          .elm-error > * {
            width: calc(80ch);
            padding: 2rem;
          }
        </style>
        <div class="elm-error__background"></div>
        <div class="elm-error__parent">
          <div class="elm-error"></div>
        </div>
      \`
    }
  }

  import.meta.hot.on('elm:error', (data) => {
    if (!customElements.get('elm-error-overlay')) {
      customElements.define('elm-error-overlay', ElmErrorOverlay)
    }

    let existingOverlay = document.querySelector('elm-error-overlay')
    if (existingOverlay) {
      existingOverlay.onContentChanged(data.error)
    } else {
      let node = document.createElement('elm-error-overlay')
      let root = document.body
      root.appendChild(node)
      document.querySelector('elm-error-overlay').onContentChanged(data.error)
    }
  })

  import.meta.hot.on('elm:success', (data) => {
    if (data.id === id) {
      let existingOverlay = document.querySelector('elm-error-overlay')
      if (existingOverlay) {
        existingOverlay.remove()
      }
    }
    if (!wasSuccessful) {
      import.meta.hot.invalidate('Triggering reload!')
    }
  })

  if (import.meta.env.DEV) {
    import.meta.hot.send('elm:client-ready', { id })
  }

  import.meta.hot.accept((module) => {
    var data = ${isReactComponent ? "module.__program" : "module.default"}.init("__elmWatchReturnData");
    var apps = import.meta.hot.data.elmApps || [];
    var reloadReasons = [];
    for (var index = 0; index < apps.length; index++) {
      var app = apps[index];
      if (app.__elmWatchProgramType !== data.programType) {
        reloadReasons.push("PROGRAM_TYPE_CHANGED");
      } else {
        try {
          var innerReasons = app.__elmWatchHotReload(data);
          reloadReasons = reloadReasons.concat(innerReasons);
        } catch (error) {
          reloadReasons.push("INCOMPATIBLE_MODEL_CHANGES");
        }
      }
    }
    if (reloadReasons.length > 0) {
      for (var index = 0; index < apps.length; index++) {
        apps[index].unmount();
      }
      import.meta.hot.invalidate(reloadReasons[0]);
    }
  })
}
`
