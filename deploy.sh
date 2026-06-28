#!/usr/bin/env bash
# Deploy wega-learn to learnapp.ipipapa.com (Hetzner)
# Vor Aufruf: node build-challenges.mjs ausführen

set -e

SERVER="root@78.47.172.148"
SSH_KEY="C:/Users/Korbinian Slavik/.ssh/id_ed25519"
REMOTE_DIR="/root/wega-learn"

echo "→ Sync files..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.claude' \
  --exclude='infra-ref' \
  --exclude='*.md' \
  --exclude='deploy.sh' \
  -e "ssh -i \"$SSH_KEY\"" \
  ./ "$SERVER:$REMOTE_DIR/"

echo "→ Build & restart container..."
ssh -i "$SSH_KEY" "$SERVER" "
  cd $REMOTE_DIR &&
  docker build -t wega-learn . &&
  docker stop wega-learn 2>/dev/null || true &&
  docker rm wega-learn 2>/dev/null || true &&
  docker run -d --name wega-learn --restart unless-stopped -p 127.0.0.1:21051:80 wega-learn
"

echo "✓ Deployed. Apache proxied via port 21051."
