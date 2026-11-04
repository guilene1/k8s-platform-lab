#!/usr/bin/env bash
# Build one app image for the cluster's CPU platform and push it to ECR.
# Called by terraform (images.tf); safe to run by hand:
#   ./build-push.sh <ecr-repository-url> <tag> <build-context> <dockerfile> <platform> <region>
# e.g.
#   ./build-push.sh 111122223333.dkr.ecr.us-east-1.amazonaws.com/k8slab/shopline-api \
#     manual-1 ../../apps ../../apps/shopline/api/Dockerfile linux/arm64 us-east-1
set -euo pipefail

repository="$1"
tag="$2"
context="$3"
dockerfile="$4"
platform="$5"
region="$6"
registry="${repository%%/*}"

command -v docker >/dev/null || { echo "docker is required (Docker Desktop or Docker Engine with buildx)" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon is not running - start Docker and re-run terraform apply" >&2; exit 1; }

# Skip the build if this exact tag is already in ECR (e.g. after re-creating
# state). Tags are content hashes, so same tag = same source.
if aws ecr describe-images --region "$region" \
     --repository-name "${repository#*/}" --image-ids imageTag="$tag" >/dev/null 2>&1; then
  echo "== $repository:$tag already in ECR, skipping build"
  exit 0
fi

# Logins are per registry and cached by docker; repeating them is harmless.
aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry" >/dev/null

echo "== building $repository:$tag for $platform"
docker buildx build \
  --platform "$platform" \
  --provenance=false \
  --file "$dockerfile" \
  --tag "$repository:$tag" \
  --push \
  "$context"
