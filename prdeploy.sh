#!/usr/bin/env bash
if [ “$TRAVIS_PULL_REQUEST” == “false” ]; then
echo “Not a PR. Skipping surge deployment.”
else
  npm i -g surge

  SURGE_LOGIN=${SURGE_LOGIN}
  SURGE_TOKEN=${SURGE_TOKEN}
  DEPLOY_DOMAIN=https://postwoman-preview-pr-${TRAVIS_PULL_REQUEST}.surge.sh

  surge --project ./dist --domain $DEPLOY_DOMAIN;

  node ./tests/ci/prmessage.js

  body_template=./tests/ci/body_template.json

  curl -X POST \
    --silent --output /dev/null \
    -H "Authorization: token ${GITHUB_ACCESS_TOKEN}" \
    -H 'Content-Type: application/json; charset=utf-8' \
    -d @$body_template "https://api.github.com/repos/${TRAVIS_REPO_SLUG}/issues/${TRAVIS_PULL_REQUEST}/comments"

exit 0
fi
