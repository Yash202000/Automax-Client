#!/bin/sh

# Generate runtime config from environment variables
cat <<EOF > /app/dist/config.js
window.APP_CONFIG = {
  API_URL: "${VITE_API_URL:-http://localhost:8080/api/v1}",
  WS_URL: "${VITE_WS_URL:-ws://localhost:8080}",
  BASE_PATH: "${VITE_BASE_PATH:-/}"
};
EOF

echo "Generated config.js with:"
echo "  API_URL: ${VITE_API_URL:-http://localhost:8080/api/v1}"
echo "  WS_URL: ${VITE_WS_URL:-ws://localhost:8080}"
echo "  BASE_PATH: ${VITE_BASE_PATH:-/}"

# Start the server
exec serve -s dist -l 3000
