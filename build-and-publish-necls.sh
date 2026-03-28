#!/bin/bash

set -eux

RENOVATE_VERSION="${1}"
docker buildx build -t quay.io/necls/renovate:"${RENOVATE_VERSION}" -f tools/docker/Dockerfile .
docker push quay.io/necls/renovate:"${RENOVATE_VERSION}"
