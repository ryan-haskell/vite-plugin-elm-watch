// Import this to your `src/vite-env.d.ts`
declare namespace Elm {

  /**
   * Ports allow communication between Elm and JavaScript.
   * 
   * Learn more: <https://guide.elm-lang.org/interop/ports>
   */
  export type Port
    = IncomingPort
    | OutgoingPort

  /**
   * Outgoing ports let us __listen for messages coming from Elm__.
   * 
   * Learn more: <https://guide.elm-lang.org/interop/ports#outgoing-messages-cmd>
   */
  export type OutgoingPort<data = any> = {
    subscribe: (callback: (data: data) => any) => void,
    unsubscribe: (callback: (data: data) => any) => void,
    send: undefined
  }

  /**
   * Incoming ports let us __send messages to Elm__.
   * 
   * Learn more: <https://guide.elm-lang.org/interop/ports#incoming-messages-sub>
   */
  export type IncomingPort<data = any> = {
    subscribe: undefined
    unsubscribe: undefined
    send: (data : data) => any
  }

  /**
   * An App can include "ports" that enable
   * communication between Elm and JavaScript.
   * 
   * Learn more: <https://guide.elm-lang.org/interop/flags>
   */
  export type App<ports extends { [name: string] : Port | undefined } = { [name: string] : Port | undefined }> = {
    ports?: ports
  }

  /**
   * This value is an object has an `init` function that let's you attach Elm
   * to an HTML element, and send in initial data as flags.
   * 
   * It will return an `Elm.App` object, which can include "ports"
   * that enable communication between Elm and JavaScript.
   * 
   * Learn more: <https://guide.elm-lang.org/interop/>
   */
  export type Root<flags = any> = {
    init: <ports extends { [name: string] : Port | undefined }>(args: {
      node?: Element | null,
      flags?: flags
    }) => App<ports>
  }
}

declare module "*.elm" {
  let elmRoot : Elm.Root
  export default elmRoot
}