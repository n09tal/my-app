set -e

export DOCKER_BUILDKIT=1

echo "Logging in to registry"
docker login --username huex588 --password $care4mepushimages

echo "Building Docker image"
docker build \
  --cache-from huex588/care4meteam:latest \
  -t huex588/care4meteam:${BITBUCKET_COMMIT} \
  -t huex588/care4meteam:latest \
  .

echo "Pushing images"
docker push huex588/care4meteam:${BITBUCKET_COMMIT}
docker push huex588/care4meteam:latest