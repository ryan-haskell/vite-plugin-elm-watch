module Main exposing (main)

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


type alias Model =
    { count : Int
    }


init =
    { count = 0
    }


type Msg
    = Inc
    | Dec


update : Msg -> Model -> Model
update msg model =
    case msg of
        Inc ->
            { model | count = model.count + 1 }

        Dec ->
            { model | count = model.count - 1 }


view : Model -> Html Msg
view model =
    div []
        [ button [ Html.Events.onClick Inc ] [ text "+" ]
        , p [] [ text (String.fromInt model.count) ]
        , button [ Html.Events.onClick Dec ] [ text "-" ]
        ]
