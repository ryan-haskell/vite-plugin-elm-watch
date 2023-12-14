module Name exposing
    ( Name, new
    , toFirstName, toLastName
    )

{-|

@docs Name, new
@docs toFirstName, toLastName

-}


type Name
    = Name
        { first : String
        , last : String
        }


new : { first : String, last : String } -> Name
new options =
    Name options


toFirstName : Name -> String
toFirstName (Name { first }) =
    first


toLastName : Name -> String
toLastName (Name { last }) =
    last
