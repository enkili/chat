#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
secret_file="$repo_root/aichatbox-3a719-firebase-adminsdk-fbsvc-472672b8af.json"
secret_name="FIREBASE_SERVICE_ACCOUNT_AICHATBOX_3A719"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is not installed. Install gh first." >&2
  exit 1
fi

if [[ ! -f "$secret_file" ]]; then
  echo "Service account file not found: $secret_file" >&2
  exit 1
fi

gh auth status >/dev/null 2>&1 || {
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
}

gh secret set "$secret_name" < "$secret_file"

echo "Set GitHub secret: $secret_name"