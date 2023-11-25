module Main exposing (main)

-- import Html
-- main =
--     Html.text "Hi"
-- module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes as Attr
import Html.Events


main =
    Browser.sandbox
        { init = init
        , update = update
        , view = view
        }


init =
    0


type Msg
    = Inc
    | Dec


update msg model =
    case msg of
        Inc ->
            model + 1

        Dec ->
            model - 1


view model =
    div []
        [ button [ Html.Events.onClick Inc ] [ text "+" ]
        , p [] [ text (String.fromInt model) ]
        , button [ Html.Events.onClick Dec ] [ text "-" ]
        ]
