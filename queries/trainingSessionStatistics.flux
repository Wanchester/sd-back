from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["_measurement"] == ":0")
    |>filter(fn: (r)=>r["Session"] == ":1")
    |>limit(n : 1)

