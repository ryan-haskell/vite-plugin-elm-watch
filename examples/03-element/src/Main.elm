module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes exposing (class)
import Html.Events
import Time



-- MAIN


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        }



-- INIT


type alias Model =
    { current : Int
    , status : Status
    }


type Status
    = Running
    | Stopped


initialTime : Int
initialTime =
    30


init : () -> ( Model, Cmd Msg )
init flags =
    ( { current = initialTime
      , status = Stopped
      }
    , Cmd.none
    )



-- UPDATE


type Msg
    = Decrement
    | Reset
    | Start
    | Stop


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Reset ->
            ( { model | current = initialTime }
            , Cmd.none
            )

        Start ->
            ( { model | status = Running }
            , Cmd.none
            )

        Stop ->
            ( { model | status = Stopped }
            , Cmd.none
            )

        Decrement ->
            case model.current - 1 of
                0 ->
                    ( { model
                        | status = Stopped
                        , current = initialTime
                      }
                    , Cmd.none
                    )

                newCurrent ->
                    ( { model | current = newCurrent }
                    , Cmd.none
                    )


subscriptions : Model -> Sub Msg
subscriptions model =
    case model.status of
        Running ->
            Time.every 1000 (\_ -> Decrement)

        Stopped ->
            Sub.none



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ h1 []
            [ text ("Timer: " ++ String.fromInt model.current ++ "s")
            ]
        , case model.status of
            Running ->
                div [ class "row gap_8" ]
                    [ viewButton "Stop" Stop
                    ]

            Stopped ->
                div [ class "row gap_8" ]
                    [ viewButton "Start" Start
                    , viewButton "Reset" Reset
                    ]
        ]


viewButton : String -> Msg -> Html Msg
viewButton label onClickMsg =
    button [ Html.Events.onClick onClickMsg ] [ text label ]
