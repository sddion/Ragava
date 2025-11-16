#!/bin/bash
# Bump version in lib/version.ts using CI_COMMIT_TAG or CI_PIPELINE_ID

VERSION="${CI_COMMIT_TAG:-1.0.${CI_PIPELINE_ID}}"
FILE="lib/version.ts"

if [ -z "$VERSION" ]; then
  echo "No version info found. Exiting."
  exit 1
fi

echo "// Centralized app version control" > $FILE
echo "export const APP_VERSION = \"$VERSION\";" >> $FILE

echo "Version updated to $VERSION in $FILE"
