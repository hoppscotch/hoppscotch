import Vue from "vue"

Vue.filter("formatCountry", (countryCode) =>
  String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((x) => 0x1f1a5 + x.charCodeAt())
  )
)
