module Main exposing (main)

import Browser
import Browser.Navigation exposing (Key)
import Html exposing (..)
import Html.Attributes exposing (class, href)
import Html.Events
import Pages.Counter
import Pages.Home
import Pages.Timer
import Route exposing (Route)
import Time
import Url exposing (Url)



-- MAIN


type alias Flags =
    ()


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = UrlRequested
        }



-- INIT


type alias Model =
    { flags : Flags
    , key : Key
    , url : Url
    , page : PageModel
    }


type PageModel
    = HomeModel
    | CounterModel Pages.Counter.Model
    | TimerModel Pages.Timer.Model
    | NotFoundModel


init : () -> Url -> Key -> ( Model, Cmd Msg )
init flags url key =
    let
        ( pageModel, pageCmd ) =
            initPage flags url
    in
    ( { flags = flags
      , key = key
      , url = url
      , page = pageModel
      }
    , pageCmd
        |> Cmd.map PageSent
    )


initPage : Flags -> Url -> ( PageModel, Cmd PageMsg )
initPage flags url =
    case Route.fromUrl url of
        Route.NotFound ->
            ( NotFoundModel
            , Cmd.none
            )

        Route.Home ->
            ( HomeModel
            , Cmd.none
            )

        Route.Counter ->
            ( Pages.Counter.init
                |> CounterModel
            , Cmd.none
            )

        Route.Timer ->
            Pages.Timer.init flags
                |> Tuple.mapBoth TimerModel (Cmd.map TimerMsg)



-- UPDATE


type Msg
    = PageSent PageMsg
    | UrlChanged Url
    | UrlRequested Browser.UrlRequest


type PageMsg
    = HomeMsg Never
    | CounterMsg Pages.Counter.Msg
    | TimerMsg Pages.Timer.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PageSent pageMsg ->
            pageUpdate pageMsg model.page
                |> Tuple.mapBoth
                    (\page -> { model | page = page })
                    (Cmd.map PageSent)

        UrlChanged url ->
            let
                ( pageModel, pageCmd ) =
                    initPage model.flags url
            in
            ( { model
                | url = url
                , page = pageModel
              }
            , pageCmd
                |> Cmd.map PageSent
            )

        UrlRequested (Browser.Internal url) ->
            ( model
            , Browser.Navigation.pushUrl model.key (Url.toString url)
            )

        UrlRequested (Browser.External externalUrl) ->
            ( model
            , Browser.Navigation.load externalUrl
            )


pageUpdate : PageMsg -> PageModel -> ( PageModel, Cmd PageMsg )
pageUpdate msg model =
    case ( msg, model ) of
        ( CounterMsg innerMsg, CounterModel innerModel ) ->
            ( Pages.Counter.update innerMsg innerModel
                |> CounterModel
            , Cmd.none
            )

        ( TimerMsg innerMsg, TimerModel innerModel ) ->
            Pages.Timer.update innerMsg innerModel
                |> Tuple.mapBoth TimerModel (Cmd.map TimerMsg)

        _ ->
            ( model, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions model =
    case model.page of
        NotFoundModel ->
            Sub.none

        HomeModel ->
            Sub.none

        CounterModel _ ->
            Sub.none

        TimerModel innerModel ->
            Pages.Timer.subscriptions innerModel
                |> Sub.map TimerMsg
                |> Sub.map PageSent



-- VIEW


view : Model -> Browser.Document Msg
view model =
    { title = "Vite + Elm: Application"
    , body =
        [ div [ class "col gap_16 align_left" ]
            [ div [ class "row gap_8" ]
                (List.map viewLink [ Route.Home, Route.Counter, Route.Timer ])
            , pageView model.page
                |> Html.map PageSent
            ]
        ]
    }


pageView : PageModel -> Html PageMsg
pageView model =
    case model of
        NotFoundModel ->
            Html.text "Page not found..."

        HomeModel ->
            Pages.Home.view
                |> Html.map HomeMsg

        CounterModel innerModel ->
            Pages.Counter.view innerModel
                |> Html.map CounterMsg

        TimerModel innerModel ->
            Pages.Timer.view innerModel
                |> Html.map TimerMsg


viewLink : Route -> Html Msg
viewLink route =
    case route of
        Route.Home ->
            a [ href "/" ] [ text "Home" ]

        Route.Counter ->
            a [ href "/counter" ] [ text "Counter" ]

        Route.Timer ->
            a [ href "/timer" ] [ text "Timer" ]

        Route.NotFound ->
            a [ href "/404" ] [ text "Not found" ]
