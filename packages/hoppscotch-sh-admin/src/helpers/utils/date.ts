export function shortDateTime(
  date: string | number | Date,
  includeTime: boolean = true
) {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime
      ? {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        }
      : {}),
  })
}
