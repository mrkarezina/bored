#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
THEME_FILE="$1"
OUTPUT="${2:-index.html}"
ENGINE="$SCRIPT_DIR/engine"

if [ -z "$THEME_FILE" ]; then
  echo "Usage: build.sh <theme.js> [output.html]"
  exit 1
fi

if [ ! -f "$THEME_FILE" ]; then
  echo "Error: Theme file '$THEME_FILE' not found"
  exit 1
fi

{
  # HTML+CSS+DOM (everything up to and including <script>)
  sed -n '1,/<script>/p' "$SCRIPT_DIR/shell.html"

  # Theme object
  cat "$THEME_FILE"

  # Engine modules in dependency order
  cat "$ENGINE/constants.js"
  cat "$ENGINE/audio-engine.js"
  cat "$ENGINE/particle-engine.js"
  cat "$ENGINE/input-handler.js"
  cat "$ENGINE/hud.js"
  cat "$ENGINE/scoreboard-client.js"
  cat "$ENGINE/scoreboard-ui.js"
  cat "$ENGINE/speed-lines.js"
  cat "$ENGINE/floating-text.js"
  cat "$ENGINE/runner-engine.js"

  # Closing tags (everything from </script> onward)
  sed -n '/<\/script>/,$p' "$SCRIPT_DIR/shell.html"
} > "$OUTPUT"

echo "Built $OUTPUT"
