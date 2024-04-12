// Vitest doesn't work without globals
// Ref: https://github.com/relmify/jest-fp-ts/issues/11

import decodeMatchers from "@relmify/jest-fp-ts/dist/decodeMatchers"
import eitherMatchers from "@relmify/jest-fp-ts/dist/eitherMatchers"
import optionMatchers from "@relmify/jest-fp-ts/dist/optionMatchers"
import theseMatchers from "@relmify/jest-fp-ts/dist/theseMatchers"
import eitherOrTheseMatchers from "@relmify/jest-fp-ts/dist/eitherOrTheseMatchers"
import { expect } from "vitest"

expect.extend(decodeMatchers.matchers)
expect.extend(eitherMatchers.matchers)
expect.extend(optionMatchers.matchers)
expect.extend(theseMatchers.matchers)
expect.extend(eitherOrTheseMatchers.matchers)
