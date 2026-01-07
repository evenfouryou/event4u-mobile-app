#!/bin/bash
# Script to push to GitHub using the personal access token from secrets

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "Error: GITHUB_PERSONAL_ACCESS_TOKEN not found in secrets"
  exit 1
fi

REPO_URL="https://evenfouryou:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/evenfouryou/Event-Four-You-2026.git"

git push --force "$REPO_URL" main

echo "Push completed!"
