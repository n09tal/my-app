set -e

export DOCKER_BUILDKIT=1

IMAGE_REPO="${IMAGE_REPO:-my-app/frontend}"
IMAGE_TAG="${IMAGE_TAG:-${GITHUB_SHA:-$(git rev-parse --short HEAD)}}"

echo "Building Docker image"
docker build \
  --cache-from "${IMAGE_REPO}:latest" \
  -t "${IMAGE_REPO}:${IMAGE_TAG}" \
  -t "${IMAGE_REPO}:latest" \
  .

echo "Pushing images"
docker push "${IMAGE_REPO}:${IMAGE_TAG}"
docker push "${IMAGE_REPO}:latest"