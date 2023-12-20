# 06-react-app
> An example of embedding Elm in an existing React project

## Running this example

```
npm install
npm run dev
```

## First-time setup

Want to add Elm to your own React + Vite project? Here's how you can!

1. Installing the plugin
2. Adding the plugin to your Vite config
3. Create a new Elm project
4. Add your first Elm component
5. Use Elm in React


### 1. Installing the plugin

In the folder containing your `package.json`, run this command:

```
npm install -D vite-plugin-elm-watch
```

### 2. Adding the plugin to your Vite config

Now that `vite-plugin-elm-watch` is installed, you can add it to your `vite.config.ts`

```ts
// ... other imports
import elm from 'vite-plugin-elm-watch'

export default defineConfig({
  // ...
  plugins: [
    // ... other plugins
    elm({ output: 'react' })
  ],
})
```

__⭐️ Tip:__ Including the `output: 'react'` option will optimize Elm for use in React projects.

### 3. Create a new Elm project

In the directory with your `package.json` file, run the following command:

```
npx elm init
```

This will create a new `elm.json` file to track Elm package dependencies (and define `src` directories).

__⭐️ Tip:__ Now is also a good time to add `/elm-stuff` to your `.gitignore` file. You can think of "elm-stuff" like the "node_modules" for Elm– we won't want it in our source control.

### 4. Add your first Elm component

Create a new file at `src/Components/Greeting.elm` with the following content:

```elm
module Components.Greeting exposing (main)

import Html exposing (..)


main : Html msg
main =
    Html.text "Hello, from Elm!"
```


### 5. Use Elm in React

Now that you have an Elm component that's ready to use, let's add it to our React project.

Here's an example of embedding it in a file at `src/App.tsx`

```tsx
// ... other imports
import Greeting from './Components/Greeting.elm'

const App = () => {
  return (
    <div>
      <h1>My App</h1>
      <!-- Drop it in just like a React component! -->
      <Greeting />
    </div>
  )
}
```

If you're using TypeScript, you might see import errors for `*.elm` files. You can fix them by adding this line to your `vite-env.d.ts` file:

```ts
/// <reference types="vite-plugin-elm-watch/client/react" />
```

This will let TypeScript know that `*.elm` files should be treated as React components.
