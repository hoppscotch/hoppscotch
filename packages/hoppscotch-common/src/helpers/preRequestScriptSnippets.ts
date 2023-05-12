export default [
  {
    name: "Environment: Set an environment variable",
    script: `\n\n// Set an environment variable
pw.env.set("variable", "value");`,
  },
  {
    name: "Environment: Set timestamp variable",
    script: `\n\n// Set timestamp variable
const currentTime = Date.now();
pw.env.set("timestamp", currentTime.toString());`,
  },
  {
    name: "Environment: Set random number variable",
    script: `\n\n// Set random number variable
const min = 1
const max = 1000
const randomArbitrary = Math.random() * (max - min) + min
pw.env.set("randomNumber", randomArbitrary.toString());`,
  },
]
