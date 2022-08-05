from(bucket: "test")
    |>range(start: :3, stop: :4)
    |>filter(fn: (r)=>r["Player Name"] == ":0")
    |>filter(fn: (r)=>r["_measurement"] == ":1")//teamName
    |>filter(fn: (r)=>r["_field"] == ":2")
    |>window(every: :6s)
    |>mean()
    |>duplicate(column: "_stop", as: "_time")
    |>window(every: inf)
