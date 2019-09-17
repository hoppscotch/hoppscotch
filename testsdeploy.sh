#!/usr/bin/env bash

if [ "$TRAVIS_PULL_REQUEST" == "true" ]; then
  echo "Do not build Pull Requests. Skipping surge deployment."

elif [ "$TRAVIS_PULL_REQUEST" == "false" ] && [[ "$TRAVIS_BRANCH" =~ ^tests ]]; then 
  npm i -g surge

  SURGE_LOGIN=${SURGE_LOGIN}
  SURGE_TOKEN=${SURGE_TOKEN}

  DEPLOY_DOMAIN=https://postwoman-${TRAVIS_COMMIT}.surge.sh

  surge --project ./dist --domain $DEPLOY_DOMAIN;

  node ./tests/ci/prmessage.js $DEPLOY_DOMAIN

  body_template=./tests/ci/body_template.json

  curl -X POST \
    --silent --output /dev/null \
    -H "Authorization: token ${GITHUB_ACCESS_TOKEN}" \
    -H 'Content-Type: application/json; charset=utf-8' \
    -d @$body_template "https://api.github.com/repos/${TRAVIS_REPO_SLUG}/commits/${TRAVIS_COMMIT}/comments"

else
  echo "Branch is not named as /^tests-/. Skipping surge deployment."
  exit 0
fi
