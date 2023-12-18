module Route exposing (Route(..), fromUrl)

import Url exposing (Url)
import Url.Parser exposing ((</>), Parser)


type Route
    = Home
    | Counter
    | Timer
    | NotFound


fromUrl : Url -> Route
fromUrl url =
    Url.Parser.parse parser url
        |> Maybe.withDefault NotFound


parser : Parser (Route -> a) a
parser =
    Url.Parser.oneOf
        [ Url.Parser.map Home Url.Parser.top
        , Url.Parser.map Counter (Url.Parser.s "counter")
        , Url.Parser.map Timer (Url.Parser.s "timer")
        ]
