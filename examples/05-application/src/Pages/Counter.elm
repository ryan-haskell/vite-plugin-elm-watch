module Pages.Counter exposing
    ( Model
    , Msg
    , init
    , update
    , view
    )

import Html exposing (..)
import Html.Events



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
            { model | count = model.count + 1 }



-- VIEW


view : Model -> Html Msg
view model =
    button [ Html.Events.onClick Increment ]
        [ text ("Count: " ++ String.fromInt model.count)
        ]
