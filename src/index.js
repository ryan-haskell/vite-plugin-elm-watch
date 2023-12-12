import os from 'os'
import fs from 'fs'
import { minify } from 'terser'
import path from 'path'
import { make } from '../elm-watch/src/SpawnElm.js'
import { inject } from '../elm-watch/src/Inject.js'
import { walkImports } from '../elm-watch/src/ImportWalker.js'
import * as ElmErrorJson from './elm-error-json.js'
import { findClosest } from '../elm-watch/src/PathHelpers.js'
import { readAndParse, getSourceDirectories } from '../elm-watch/src/ElmJson.js'

/**
 * @type {{ [filepath: string]: Set<string> }}
 */
let elmEntrypointObject = {}


/**
 * @param {{ isBodyPatchEnabled : boolean; mode: 'auto' | 'standard' | 'debug' | 'optimize' | 'minify' }} args
 * @returns {import("vite").Plugin}
 */
export default function elmWatchPlugin(args = {}) {
  // Handle arguments and defaults
  let mode = args.mode === undefined ? 'auto' : args.mode
  let isBodyPatchEnabled = typeof args.isBodyPatchEnabled === 'boolean'
    ? args.isBodyPatchEnabled
    : false

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

        let fallbackCode = `let Elm = new Proxy({}, { get(_t, prop, _r) { return (prop === 'init') ? () => ({}) : Elm } }); export default Elm; ${hmrClientCode(id, false)}; import.meta.hot.accept()`

        switch (makeResult.tag) {
          case 'Success':
            let compiledElmJs = fs.readFileSync(tempOutputFilepath, { encoding: 'utf-8' })
            lastErrorSent[id] = null

            if (server) {
              server.ws.send('elm:success', { id })
            }
            let transformedElmJs = compiledElmJs
            if (inDevelopment && !shouldMinify) {
              transformedElmJs = inject(compilationMode, transformedElmJs)
            }
            if (isBodyPatchEnabled) {
              transformedElmJs = patchBodyNode(transformedElmJs)
            }
            if (shouldMinify) {
              transformedElmJs = await toMinifiedElmCode(transformedElmJs)
            }

            if (inDevelopment) {
              lastSuccessfulCompiledJs[id] = `export default ({ run () { ${initElmWatchWindowVarCode}; ${transformedElmJs}; return window.Elm } }).run(); ${hmrClientCode(id, true)}`
            } else {
              lastSuccessfulCompiledJs[id] = `export default ({ run () { ${transformedElmJs}; return this.Elm } }).run()`
            }

            return lastSuccessfulCompiledJs[id]
          case "ElmNotFoundError":
            let error = [
              'Elm could not be found... Please try again after running:',
              '',
              '    npm install -D elm',
              '',
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
                return fallbackCode
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
    .split('var bodyNode = _VirtualDom_doc.body')
    .join('var bodyNode = (args && args.node && args.node.id) ? _VirtualDom_doc.getElementById(args.node.id) : _VirtualDom_doc.body')
    .split(`_VirtualDom_node('body')`)
    .join(`_VirtualDom_node((args && args.node && args.node.localName) ? args.node.localName : 'body')`)
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

const hmrClientCode = (id, wasSuccessful) => `
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
            font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
            font-size: 1rem;
            white-space: nowrap;
            line-height: 1.4;
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
}
`