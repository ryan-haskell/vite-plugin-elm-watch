import os from 'os'
import fs from 'fs'
import path from 'path'
import { make } from '../elm-watch/src/SpawnElm.js'
import { inject } from '../elm-watch/src/Inject.js'
import { walkImports } from '../elm-watch/src/ImportWalker.js'
import ElmErrorJson from './elm-error-json.js'
import { findClosest } from '../elm-watch/src/PathHelpers.js'
import { readAndParse, getSourceDirectories } from '../elm-watch/src/ElmJson.js'

/**
 * @type {{ [filepath: string]: Set<string> }}
 */
let elmEntrypointObject = {}

const initElmWatchWindowVarCode = `
let { __ELM_WATCH } = window;
if (typeof __ELM_WATCH !== "object" || __ELM_WATCH === null) {
    __ELM_WATCH = {};
    Object.defineProperty(window, "__ELM_WATCH", { value: __ELM_WATCH });
}
`

const hmrClientCode = `
if (import.meta.hot) {
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
            opacity: 0.5;
            background: black;
          }

          .elm-error {
            position: relative;
            background: linear-gradient(#333, #303030);
            color: white;
            font-weight: 400;
            font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
            font-size: min(1rem, 1.5vw);
            padding: 2rem;
            white-space: nowrap;
            line-height: 1.4;
            border-radius: 0.25rem;
            box-shadow: 0 1rem 1rem rgba(0, 0, 0, 0.125);
            border-top: solid 0.5rem indianred;
            max-height: calc(100vh - 4rem);
            overflow: auto;
            width: 100%;
            max-width: 72em;
            box-sizing: border-box;
          }
        </style>
        <div class="elm-error__background"></div>
        <div class="elm-error"></div>
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
      document.body.appendChild(node)
      document.querySelector('elm-error-overlay').onContentChanged(data.error)
    }

  })

  import.meta.hot.on('elm:success', () => {
    let existingOverlay = document.querySelector('elm-error-overlay')
    if (existingOverlay) {
      existingOverlay.remove()
    }
  })

  if (import.meta.env.DEV) {
    import.meta.hot.send('elm:client-ready')
  }

}
`

/**
 * @returns {import("vite").Plugin}
 */
export default function elmWatchPlugin() {
  /**
   * @type {import("vite").ViteDevServer | undefined}
   */
  let server = undefined
  let lastErrorSent = undefined
  let esmCompiledElmJs = undefined

  return {
    name: 'elm-watch',
    configureServer(server_) {
      server = server_

      server.ws.on('elm:client-ready', () => {
        if (lastErrorSent) {
          server.ws.send('elm:error', {
            error: ElmErrorJson.toColoredHtmlOutput(lastErrorSent)
          })
        }
      })
    },

    // TODO: Think about file deletion! 🚨
    async handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.elm')) {
        let entrypointModules = Object.entries(elmEntrypointObject)
          .filter(([_id, set]) => set.has(ctx.file))
          .map(([id]) => ctx.server.moduleGraph.getModuleById(id))

        return entrypointModules
      }
    },

    async load(id) {
      if (id.endsWith('.elm')) {

        let tmpDir = os.tmpdir()
        let tempOutputFilepath = path.join(tmpDir, 'out.js')

        let compilationMode = 'optimize'

        let elmMake = make({
          elmJsonPath: {
            tag: 'ElmJsonPath', theElmJsonPath: {
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
            let elmWatchCompiledJs = inject(compilationMode, compiledElmJs)
            esmCompiledElmJs = `export default ({ run () { ${initElmWatchWindowVarCode}; ${elmWatchCompiledJs}; return window.Elm } }).run(); ${hmrClientCode}`

            lastErrorSent = null
            if (server) {
              server.ws.send('elm:success', { msg: 'Success!' })
            }

            return esmCompiledElmJs
          case 'ElmMakeError':
            let elmError = makeResult.error
            lastErrorSent = elmError
            if (server) {
              server.ws.send('elm:error', {
                error: ElmErrorJson.toColoredHtmlOutput(elmError)
              })
            }
            return `export default {}; ${hmrClientCode}; import.meta.hot.accept()`
          default:
            throw new Error(JSON.stringify(makeResult, null, 2))
        }
      }
    }
  }
}

/** 
 * @param {string} id
 * @returns {import("../elm-watch/src/Types.js").InputPath}
*/
const toInputPath = (id) => ({
  tag: 'InputPath',
  originalString: 'src/Main.elm',
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