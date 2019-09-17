const fs = require('fs')
const cypress = require('cypress')
const DEPLOY_DOMAIN = process.argv[2]//`https://postwoman-${TRAVIS_COMMIT}.surge.sh`

function e2e (testUrl, niceMessage) {
  cypress.run({
    config: {
      baseUrl: testUrl,
      video: false
    }
  })
  .then((result) => {
    const content = niceMessage(result)
    fs.writeFileSync('./tests/ci/body_template.json', JSON.stringify(content))
  })
  .catch((err) =>console.error(`Failed to run tests: /n${err}`))
}

function niceMessage (result) {
  if (typeof(result) !== 'object') throw new Error('Result of e2e testing must be a Object')

  let specTable = `
| Spec | Tests | Passing | Failing | Pending | Skipped |
| :--- | ----: | ------: | ------: | ------: | ------: |
`
  result.runs.forEach(run => {
    const stats = run.stats
    specTable = specTable + `| ${run.spec.name} | ${stats.tests} | ${stats.passes} | ${stats.failures} | ${stats.pending} | ${stats.skipped} |\n`
  })

  return {
    "body": `
### Pull Request preview:

${result.config.baseUrl}

### Tests (e2e)
#### Results 

| Decription    | Results                     |
| :-------------- | ------------------------: |
| Test duration   | ${result.totalDuration}   |
| Total tests     | ${result.totalTests}      |
| Failed          | ${result.totalFailed}     |
| Passed          | ${result.totalPassed}     |
| Pending         | ${result.totalPending}    |
| Skipped         | ${result.totalSkipped}    |

#### Spec
${specTable}

#### Complete log
https://travis-ci.com/${process.env.TRAVIS_REPO_SLUG}/builds/${process.env.TRAVIS_BUILD_ID} (click at __$ ./testsdeploy.sh__)\n

>Run locally: __npm run dev:e2e__\n
>Create and edit tests at: __/tests/e2e/integrations/__
`
  }
}

e2e(DEPLOY_DOMAIN, niceMessage)