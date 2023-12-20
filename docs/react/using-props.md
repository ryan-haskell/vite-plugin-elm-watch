# Working with React: Props and Elm

When working inside of a React application, it's common for Elm components to send data to the rest of your React application.

It's also common for React to send _Elm_ initial data or notify your Elm component when React state has been updated.

This guide will cover all those topics, so you know how to use React + Elm together!

__Topics in this guide:__

- [Basic usage](#basic-usage)
- [Sending initial data](#sending-initial-data)
- [Keeping values in sync (from React to Elm)](#keeping-values-in-sync)
- [Emitting events from Elm to React](#emitting-events-from-elm-to-react)

### Basic usage

This is a basic example of embedding an Elm component that doesn't involve any React props.

```jsx
import Counter from './Components/Counter.elm'

const App = () => {
  return (
    <div className="app">
      <h1>My app</h1>
      <Counter />
    </div>
  )
}
```

This application renders an Elm `Counter` component inside a React `App` component. 

Let's see how we can use React props to handle more advanced stuff with the `vite-plugin-elm-watch` plugin.

### Sending initial data

Let's imagine our `Counter` component wants React to decide what the initial `count` value should be (instead of always starting at 0).

Here's how we would pass that information to Elm:

```jsx
import Counter from './Components/Counter.elm'

const App = () => {
  let initialCount = 100

  return (
    <div className="app">
      <h1>My app</h1>
      <Counter initialCount={initialCount} />
    </div>
  )
}
```

Now that our React app is sending in an `initialCount` of `100` to our component, we'll have access to it as [Elm Flags](https://guide.elm-lang.org/interop/flags).

We can use our flags to initialize our Elm component's `count` value like this:

```elm
module Components.Counter exposing (main)

-- ...

type alias Flags =
    { initialCount : Int
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { count = flags.initialCount }
    , Cmd.none
    )
```

Now our counter will start at `100` instead of `0`, because that was the value passed in from React.

## Keeping values in sync

Your app might have a React component changing the value of something that needs to be used by an Elm component.

Maybe you have a React text field whose value should also be rendered somewhere in an Elm component.

We can use the same strategy from the last section to keep Elm up-to-date as users change that input in your React text field. Let's try it out:

```jsx
import { useState } from 'react'
import Counter from './Components/Counter.elm'

const App = () => {
  let [label,setLabel] = useState('Count')

  let onLabelInput = (event) => {
    setLabel(event.target.value)
  }

  return (
    <div className="app">
      <h1>My other app</h1>
      <input value={label} onInput={onLabelInput} />
      <Counter label={label} />
    </div>
  )
}
```

In the example above, we have an `<input>` tag in React that can change the state of a label.

Initially, this value is passed to our Elm `Counter` component as flags– but that `label` prop is also streamed realtime via Elm's ports!

As the user changes the value of the text input, here's how we can make sure our Elm component has access to the latest version:

```elm
module Components.Counter exposing (main)

-- ...

-- 1️⃣ Add a "label" field to your `Model`
type alias Model =
    { -- ...
    , label : String
    }


-- 2️⃣ Initialize the model with the initial 
--   "flags.label" passed in from React
init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { -- ...
      , label = flags.label
      }
    , -- ...
    )


-- 3️⃣ Define a new "PropLabelChanged" message
--   for handling any changes from React
type Msg
    = -- ...
    | PropLabelChanged String


-- 4️⃣ When a new label value comes in, update
--   your `model.label` field with the new value
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        PropLabelChanged newLabel ->
            ( { model | label = newLabel }
            , Cmd.none
            )


-- 5️⃣ Define an Elm port. The name must be "prop_"
--   followed by the prop name from React.
port prop_label : (String -> msg) -> Sub msg


-- 6️⃣ Add a subscription to listen for events on
--   the "prop_label" port, calling your `PropLabelChanged`
--   message when a change is detected!
subscriptions : Model -> Sub Msg
subscriptions model =
    prop_label PropLabelChanged

```

In the browser, as you change the React input, you'll see the value of `model.label` is totally in-sync.

The `vite-plugin-elm-watch` plugin will automatically call the ports for you anytime the React prop changes.

### Emitting events from Elm to React

It's also helpful to be able to send events back to the React app from your Elm component.

This is similar to what we did in the last example when working with ports– but this time, we'll be sending events from Elm to React.

Here's an example:

```jsx
import Counter from './Components/Counter.elm'

const App = () => {

  let onIncrement = (count) => {
    // This was sent from Elm!
    console.log(count)
  }

  return (
    <div className="app">
      <h1>My app</h1>
      <Counter onIncrement={onIncrement} />
    </div>
  )
}
```

Here, we want our Elm `Counter` component to call `onIncrement` with the latest counter value whenever it changes. From there we can do React stuff.

Here's what you'll need to add to the `Counter.elm` component:

```elm
port module Components.Counter exposing (main)

-- 1️⃣ When update gets the `Increment` 
--   message, also fire a `Cmd` for React
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        -- ...

        Increment ->
            let
                newCount =
                    model.count + 1
            in
            ( { model | count = newCount }
            , prop_onIncrement newCount
            )

-- 2️⃣ Define an outgoing port to send the
--    Int value out to React. (Must be 
--    named "prop_", followed by the prop name)
port prop_onIncrement : Int -> Cmd msg

```

That's it! The `vite-plugin-elm-watch` plugin will automatically call the function if it's passed in as a React prop to the component.