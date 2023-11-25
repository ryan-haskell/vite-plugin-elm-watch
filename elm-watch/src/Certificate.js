/*
Self-signed SSL certificate.

Not used for security; only to make `wss:` work on HTTPS pages.

Created by running:

openssl req \
  -newkey rsa:4096 \
  -x509 \
  -nodes \
  -keyout server.key \
  -new \
  -out server.crt \
  -subj /CN=test1 \
  -extensions v3_new \
  -config <(cat /System/Library/OpenSSL/openssl.cnf \
  <(printf '[v3_new]\nsubjectAltName=DNS:localhost\nextendedKeyUsage=serverAuth')) \
  -sha256 \
  -days 36500

Source: https://stackoverflow.com/a/64309893
*/
export const CERTIFICATE = {
    key: `-----BEGIN PRIVATE KEY-----
MIIJQwIBADANBgkqhkiG9w0BAQEFAASCCS0wggkpAgEAAoICAQC012uZX87KEVJA
CjTlOoBX7mzfd/T9NxrBlOPhauhGrPyxZ2FmTjZSErtgS96UCUALHyaWIlfmGCtT
XcdZbLFCxNFNuK+kIpXktSO/ZLNnryUTpZFXparAUJpyfO0bjsfJr6jc21gRZFnN
C4pbB/YMDqtQr3o5AS5pqujncUOR0jBHb5EPqlAe4B8LcrB+Hza2wLwRpyGpouhK
Sg1AQDKNx8z0XwcCp1OCpgGniqwDr0QhGWZ4X+T2zivhHag2ZdbfuPYI3se9hl31
EX9X5OXNVKi+CVOu0CdsrWVMVm665A8oi/pVr+m8xZdivbEmQwNRbYLpEAc1UcE2
8yHu6PITcB9+i7bKtDMO4ULWFPO6xivXpQqXsA1og8D4yEDHrCzaD7iewPuxaAtT
bJONUMcoNobOD42K2gDs6ZYKzc2ci1GljsXfQ1iO9RSgxpmIwg7T+od5h6clZxwV
7L7YLvi06IXuroXiApXw4ZJa771Nt9xCcH42/AJ9Tka45B/nlF7rqcPPywsjR95t
cac77D8VJbZHj7oulvWdsks/elbs0Q6v0mkmxYu88lMaeXDR2DTaw1lyrF7H0zuY
MBgH/7JRqdQ59zh2iQ3GwAlS8eC4ACVOhMihWsBxNEsk2/WlgBByRDGDX0GTyEGH
yMjPtAi5qcsg7IolWwWqrz4Ik9JibQIDAQABAoICAFVlAA9N2ZU7tq4845t3E5Hy
KYEg4RQNSFovF6ijVgnBuBWBrtGjjy0UYVzolrMq5w4ZaJwunXku4o6cUv1cQRw5
WmisFGyaVFPKYZYIVFtarlRns4lC1q23oib77O89bgREKaYZAa48x9b2Yx/3U22A
I8+W/U0bzLHjHdXkezbJnTiuaz6NewYJaT97qfH0hV6pBmYDmPbE0ZH7A+TaK8Ud
mx+uG95Z6ypff5qA9hdLVQ2YM/YVukX9N2U3Hu6JCn1clvm7UXCimY2W9J4pnYZn
OsN6HgUHkAZWnuX8To98D9hiuRRrXCFi4MiksJlTvaZe4xlxEyZPc8Ch8N0jLOPL
Yp0RXbtBhE8sFLVPI0DTfXmJluGu91nUBPM5yl/cf4V+FPL7vGE98TDPVdq+ryih
5ebOATi5zW7/WPRBL1A1dtlKvwl06ZsMZ5S6zFHjr4QO2XyJ3VAKwx6lYl5ezPfb
2p9ccq5esjAAl3d0EggtLI2Y5vnMlpWUG2euupNanHhOSGMemtQLrmLTLQEL5WMW
F5nKjKMMutTAHVZlWyPPP/PAXmJBBRS80G7z1+qLOy3pYqGLML5d0H6wduMwyfof
uC16FvW/RmWlhxOiz/RLJi6a8jMhSqZPZ0GVOgsE+3mH4qndv6rI1GKKtuSjA1fo
i8uEfGp3ty5DdGWFSFMVAoIBAQDjbLXbZJE4p5wb3a3Ijb36xZHyruSWOa2DxWue
oPeyeXo/uQq26wuJWNHlaqXGxCH8tJXKKB3tikdBZQrFzok4wHbD2cF1m56aFYQ9
3LAlheZmmr3LvxqY0hLg+5viIHFywafGQxSt/7qBTizu9F1WQ/XVd4r5mgq9BIre
uunImEfq+7/8Xz3uNHk2kir6WYvhSB+bmge7u4qw4hfrKGvgZkUudTaBQOBByqlB
gk8N9MtFJ7HPbSlpXNfodK+ZLnOgnpfZs27BUEenFHcnTMcX6cJkJsOgeMUuLFoM
a3mJoz0NR3fOiaNIgTfhpe7H6jT75vmcSFVXO7OvnHnbBzj/AoIBAQDLkFOSLc4d
lZWYBehyUEPUgTTSJRNy09TY9uaBLB7E67ue6Ey8SWdaq1YFI9dYj7UGgRalNGX5
jprli/kOfl+LY3CCq471qMFJWMGaVyzOUmqTfXXuIvDr5N0+/gc1LvejcR1dGOWG
BFFnNgrIqYkgNrBn7qKmHJ+DS4/r6fmGp6LWXB1IZb4A3+0N3AtFYEvATycd6+ho
C64CtXHjOyrD6D6yIV1GSqHofBogW2Lw2cPll6rkwBrjnQQWY4ttFPRMivOA22Kj
5UL5x+O1cAF1gF2rcQjfFbgqxQ4xLgAxs34ZEyTAMlKFRHMEf71PrwSRiVt3qpry
j5JN0qL/61iTAoIBAQC5KVNPEqwhwmUZUv0gojahK6ZOPhKiNMeO13dtqYTB7KGZ
rCCLGQdFhekurgvWru01ABpMgykKs2CcX5XLwwJ6EEkh3/LgvBj/PrFyZHGNu10B
AM+ySR9weOkh//jEvMFhO0ZL52W43NKOYIW473/msmI+sJuX6NEBX+dovCmHRmSX
buy6nxifDl36DjurpKh8fOovF9NgB6s9pHbw4PIju2BsGMaNqbJsHoJ7cYrHxByT
a2Qbi7cBr7Oh8Q7e2rENftIHT03HWoNcBw+UEbCvSYUZYW45AtsXYsjV/9LuOteE
LkHfCLTGXV6P+zdT0N3ekgl8MnA5G8SKIA4eQ90lAoIBAQDKGc5+8O8UPDC7MBJp
e/r7/hOdF6ZJeLp3dhm/4TfjNk+eIvAcd5wfTsAmdkEU8gg+HueGuZEMxWJPyDpL
A3iEgQNxGDbk+th7o50DSM15QiYBrKvq89HRwfVO1xH84VaHdIQ8q70k4yCWofbu
5jL4QpO9fBULapuL1Pdct30/DSwEOovwFuMfJzLJcc/W3xYWJf+mG1MwCXiHw/EA
MvvwaKHmZG2gnfRFRwEBYvnGOc3eIkhOt9N6a6dlOwtwDz/ExqefJTC3m6R1LNmM
h1lLeViGH8E5Cu0/uUiv1wXmUlg9ON5h2xRGr4Cp1ND1TcPxYjfnhQA1FgmhLiEa
iGP1AoIBAFhDurkr/U0DsNGm3Cn2+GlarvoYPsXmLYJnv5yTanfII7XyBGtys2/5
sH4mEh4hx2wxHR0fDPfu4XZ4/vIMw5gg70gWRqJUeDiPvKPWWZizexNAgUx9ngc3
MCyA67cZZQ9lk10cNdujm8gjFi+I19iV43kA657IKQSQoptv+XKN4Bfuk6w0mjY1
XM1ZCpZVO/nhNmQYpgjYOMYEZuUXVwdOZx1LZXDu5kBQO2zstHkWBIKRjxPJ+gCa
vdD/AU3gLNUbUEF2rVx5YcKDQftjAMrZNtJ8GeuUK2Aoi1k5EYMo8fwkQ35UixNo
R54V/WirfICHJ9siZ4WsJk7VRFbvuhk=
-----END PRIVATE KEY-----

`,
    cert: `-----BEGIN CERTIFICATE-----
MIIE2jCCAsKgAwIBAgIJAI+JJie9DC+TMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNV
BAMTCWxvY2FsaG9zdDAgFw0yMjEwMDgxMDA3MjlaGA8yMTIyMDkxNDEwMDcyOVow
FDESMBAGA1UEAxMJbG9jYWxob3N0MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIIC
CgKCAgEAtNdrmV/OyhFSQAo05TqAV+5s33f0/TcawZTj4WroRqz8sWdhZk42UhK7
YEvelAlACx8mliJX5hgrU13HWWyxQsTRTbivpCKV5LUjv2SzZ68lE6WRV6WqwFCa
cnztG47Hya+o3NtYEWRZzQuKWwf2DA6rUK96OQEuaaro53FDkdIwR2+RD6pQHuAf
C3Kwfh82tsC8EachqaLoSkoNQEAyjcfM9F8HAqdTgqYBp4qsA69EIRlmeF/k9s4r
4R2oNmXW37j2CN7HvYZd9RF/V+TlzVSovglTrtAnbK1lTFZuuuQPKIv6Va/pvMWX
Yr2xJkMDUW2C6RAHNVHBNvMh7ujyE3Affou2yrQzDuFC1hTzusYr16UKl7ANaIPA
+MhAx6ws2g+4nsD7sWgLU2yTjVDHKDaGzg+NitoA7OmWCs3NnItRpY7F30NYjvUU
oMaZiMIO0/qHeYenJWccFey+2C74tOiF7q6F4gKV8OGSWu+9TbfcQnB+NvwCfU5G
uOQf55Re66nDz8sLI0febXGnO+w/FSW2R4+6Lpb1nbJLP3pW7NEOr9JpJsWLvPJT
Gnlw0dg02sNZcqxex9M7mDAYB/+yUanUOfc4dokNxsAJUvHguAAlToTIoVrAcTRL
JNv1pYAQckQxg19Bk8hBh8jIz7QIuanLIOyKJVsFqq8+CJPSYm0CAwEAAaMtMCsw
FAYDVR0RBA0wC4IJbG9jYWxob3N0MBMGA1UdJQQMMAoGCCsGAQUFBwMBMA0GCSqG
SIb3DQEBCwUAA4ICAQAhTBoM/lPVF83iI+7bn+gzJyA9DD3sjgTFgM9cqyfWuemg
L/KMKCqaWO3FynGuig4mNArp589zR5+rVyZTa0mxevpxEvK2J+i5sIdzlcNKBJul
WB9UNvluuop/lrC+vugHcKXSUmZeVXhdyaoOEdjz3zzhC9n/ixaLXjl0HzikAt7O
gJgDdk/d4v0ybH67r/ZhT2n2UPWWO6T/H1jc/qNKJmvpHKhia76c4h5nNk+FpLwJ
getTEJPB2cV3kR/mpXkk66WHLi3QK83z6zRkhh4aarYQ1BU7D/W/RpQrfBKJyA5C
rUi4eQXjwdhr/Hs72tnLYQyXhOWL2vvA392eWKoy8WNsewNoOn7nYxAJv5D0zdJb
hernuFyr3CsZfvlPwUZvNI5oEEIu/Rhvhp7qna6Ujh8h95zjiW2khUpBRjno3oew
O6Hj04vqL7wrhO0gXsBfMkg4ECsTVqLGu3fFV2ZeUaDyKrOcNO8+gSAkbWy3LUAh
PoksgZB44l2C7I+B37uxjoN6AweaPv98+AkS/Mg792bFfY/ZF4xNMo8Y+HgSBS5C
xcqzmsQaDOjmf5q4mjxuaZIDxb3slwpR4vaAJqCcMWK8PXqHpTz2msImWhCNnXiy
GqfVp1GwG1kla18ts1d98QWyaWjbdveZp3HMWZzQY1xOzyUX4K4Ejhho5oNl4w==
-----END CERTIFICATE-----

`,
};
