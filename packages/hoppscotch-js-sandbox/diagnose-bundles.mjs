import { readFileSync } from 'fs'

// Check ajv-formats bundle
const ajvFmt = readFileSync('src/lib-bundles/ajv-formats.iife.js', 'utf8')
const needle = 'require' + '$$' + '0'
const idx = ajvFmt.indexOf(needle)
if (idx > -1) {
  console.log('=== ajv-formats require$$0 context ===')
  console.log(ajvFmt.substring(Math.max(0, idx - 200), idx + 300))
} else {
  console.log('ajv-formats: no require$$0 found')
}

// Check first 10 lines of ajv-formats
console.log('\n=== ajv-formats first 15 lines ===')
console.log(ajvFmt.substring(0, 500))

// Check chai bundle - look for Event
const chai = readFileSync('src/lib-bundles/chai.iife.js', 'utf8')
const cidx = chai.indexOf("'Event'")
console.log('\n=== chai Event context ===')
if (cidx > -1) {
  console.log(chai.substring(Math.max(0, cidx - 100), cidx + 200))
} else {
  // the literal 'Event' without quotes
  const cidx2 = chai.indexOf('Event')
  console.log('Looking for bare Event near:', chai.substring(Math.max(0, cidx2 - 100), cidx2 + 200))
}

