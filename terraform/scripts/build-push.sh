#!/usr/bin/env bash
# Build one app image for the cluster's CPU platform and push it to ECR.
# Called by terraform (images.tf); safe to run by hand:
#   ./build-push.sh <ecr-repository-url> <tag> <build-context> <platform> <region>
set -euo pipefail

repository="$1"
tag="$2"
context="$3"
platform="$4"
region="$5"
registry="${repository%%/*}"

command -v docker >/dev/null || { echo "docker is required (Docker Desktop or Docker Engine with buildx)" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon is not running - start Docker and re-run terraform apply" >&2; exit 1; }

# Skip the build if this exact tag is already in ECR (e.g. after re-creating
# state, or when several students share a prebuilt registry).
if aws ecr describe-images --region "$region" \
     --repository-name "${repository#*/}" --image-ids imageTag="$tag" >/dev/null 2>&1; then
  echo "== $repository:$tag already in ECR, skipping build"
  exit 0
fi

# Logins are per-registry and cached by docker; repeated logins are harmless.
aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry" >/dev/null

echo "== building $repository:$tag for $platform"
docker buildx build \
  --platform "$platform" \
  --provenance=false \
  --tag "$repository:$tag" \
  --push \
  "$context"
