//returns sessions given a player name (:0)
from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == ":0")
    |>group(columns: ["Session","_measurement"], mode: "by")
    |>limit(n: 1)
    |>yield()
