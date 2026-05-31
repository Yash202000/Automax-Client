#!/bin/sh

# Patch index.html: replace build-time placeholder with the real base path.
# e.g. VITE_BASE_PATH=/ax3/ → /BASEPATHPLACEHOLDER/ becomes /ax3/
BASE_PATH="${VITE_BASE_PATH:-/}"
# Strip trailing slash for sed replacement, then re-add via the literal '/'
# in the original placeholder. This handles both "/" and "/ax3/" correctly.
BASE_NO_SLASH=$(echo "$BASE_PATH" | sed 's|/$||')
sed -i "s|/BASEPATHPLACEHOLDER|${BASE_NO_SLASH}|g" /app/dist/index.html

# Generate runtime config from environment variables
cat <<EOF > /app/dist/config.js
window.APP_CONFIG = {
  API_URL: "${VITE_API_URL:-http://localhost:8080/api/v1}",
  WS_URL: "${VITE_WS_URL:-ws://localhost:8080}",
  BASE_PATH: "${VITE_BASE_PATH:-/}",
  LOGIN_REGULAR: "${VITE_LOGIN_REGULAR:-true}",
  LOGIN_LDAP: "${VITE_LOGIN_LDAP:-true}",
  LOGIN_SSO: "${VITE_LOGIN_SSO:-true}"
};
EOF

echo "Generated config.js with:"
echo "  API_URL: ${VITE_API_URL:-http://localhost:8080/api/v1}"
echo "  WS_URL: ${VITE_WS_URL:-ws://localhost:8080}"
echo "  BASE_PATH: ${VITE_BASE_PATH:-/}"

# Start the server
exec serve -s dist -l 3000
