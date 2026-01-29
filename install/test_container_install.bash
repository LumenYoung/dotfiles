#!/usr/bin/env bash

set -euo pipefail

IMAGE="buildpack-deps:bookworm"
USER_NAME="dotuser"
REPO_DIR="/home/${USER_NAME}/dotfiles"
INSTALL_DIR="${REPO_DIR}/install"
DESKTOP_FLAG=""
CONTAINER_NAME="dotfiles-install-test"

usage() {
	cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --desktop     Include desktop extras (nerdfont + kitty)
  -h, --help    Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--desktop)
		DESKTOP_FLAG="--desktop"
		shift
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "Unknown option: $1" >&2
		usage
		exit 1
		;;
	esac
done

if ! command -v docker >/dev/null 2>&1; then
	echo "docker is required but not found" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOST_UID="$(id -u)"
HOST_GID="$(id -g)"

cleanup() {
	docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
	echo "Removing existing container: ${CONTAINER_NAME}"
	cleanup
fi

trap cleanup EXIT

docker run -d --name "${CONTAINER_NAME}" \
	-v "${HOST_REPO_DIR}:${REPO_DIR}" \
	-w "${REPO_DIR}" \
	-e HOST_UID="${HOST_UID}" \
	-e HOST_GID="${HOST_GID}" \
	"${IMAGE}" \
	bash -lc "
		set -euo pipefail
		groupadd -g \${HOST_GID} hostgroup || true
		useradd -m -u \${HOST_UID} -g \${HOST_GID} -s /bin/bash ${USER_NAME} || true
		chown -R ${USER_NAME}:\${HOST_GID} /home/${USER_NAME}
		set +e
		su - ${USER_NAME} -c 'cd ${INSTALL_DIR} && bash ./install_all.bash ${DESKTOP_FLAG}'
		install_rc=\$?
		echo \"install_all.bash exited with code: \$install_rc\"
		tail -f /dev/null
	" >/dev/null

echo "Container started: ${CONTAINER_NAME}"
echo "Attach with: docker exec -it ${CONTAINER_NAME} bash"
echo "Streaming container logs below. Press Enter to stop and remove the container."
docker logs -f "${CONTAINER_NAME}" &
LOG_TAIL_PID=$!
read -r _
kill "${LOG_TAIL_PID}" >/dev/null 2>&1 || true
