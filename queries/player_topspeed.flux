from(bucket: "test")
    |>range(start:-3y)
    |>filter(fn: (r)=>(r["Player Name"] == "Warren" and r["_field"] == "Velocity"))
    |>group(columns: ["Player Name"])
    |>max()
    |>yield()
