port module Components.Counter exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes exposing (class)
import Html.Events



-- INTEROP


type alias Flags =
    { name : String
    , initialCount : Int
    }


port prop_name : (String -> msg) -> Sub msg


port prop_onCounterIncrement : Int -> Cmd msg



-- MAIN


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        }



-- INIT


type alias Model =
    { name : String
    , count : Int
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { count = flags.initialCount
      , name = flags.name
      }
    , Cmd.none
    )



-- UPDATE


type Msg
    = Increment
    | NamePropChanged String


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Increment ->
            let
                newCount : Int
                newCount =
                    model.count + 1
            in
            ( { model | count = newCount }
            , prop_onCounterIncrement newCount
            )

        NamePropChanged newName ->
            ( { model | name = newName }
            , Cmd.none
            )


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ prop_name NamePropChanged
        ]



-- VIEW


view : Model -> Html Msg
view model =
    let
        count =
            String.fromInt model.count
    in
    div [ class "card" ]
        [ button [ Html.Events.onClick Increment ]
            [ text (model.name ++ " is " ++ count) ]
        , p []
            [ text "Edit "
            , code [] [ text "src/Components/Counter.elm" ]
            , text " and save to test HMR"
            ]
        ]
