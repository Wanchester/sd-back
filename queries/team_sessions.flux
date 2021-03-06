//returns sessions given a team's name (:0)
from(bucket: "test")
    |>range(start: -3y)
    |>filter(fn: (r) => r._measurement == ":0")
    |>group(columns: ["Session"], mode: "by")
    |>limit(n: 1)
