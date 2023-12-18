module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Events



-- MAIN


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , update = update
        , view = view
        }



-- INIT


type alias Model =
    { count : Int
    }


init : Model
init =
    { count = 0
    }



-- UPDATE


type Msg
    = Increment


update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            { model | count = model.count + 3 }



-- VIEW


view : Model -> Html Msg
view model =
    button [ Html.Events.onClick Increment ]
        [ text ("Count: " ++ String.fromInt model.count)
        ]
