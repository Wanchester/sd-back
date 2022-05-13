from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>r["Player Name"] == "${PLAYER}")
    |>group(columns: ["Session"], mode: "by")
    |>limit(n: 1)
