from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == ":0" )
    |>group(columns: ["_measurement"], mode:"by")
    |>limit(n: 1)