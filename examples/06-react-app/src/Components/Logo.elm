module Components.Logo exposing (main)

import Html exposing (..)
import Html.Attributes exposing (..)


main : Html msg
main =
    a
        [ href "https://elm-lang.org", target "_blank" ]
        [ img
            [ src "/elm.svg"
            , class "logo elm"
            , alt "Elm logo"
            ]
            []
        ]
