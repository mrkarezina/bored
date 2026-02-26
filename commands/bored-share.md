---
description: Share a local game to bored.run
allowed-tools:
  - Bash
  - Read
  - Glob
model: haiku
---

# /bored-share — Share a Game to bored.run

Upload a local game HTML file so it's playable at a public URL.

## Steps

1. **Find local games** — Use Glob to find `*.html` files in the current directory (not recursive).

2. **Select the file:**
   - If no HTML files found, tell the user: "No HTML game files found in the current directory. Generate one first with `/bored`."
   - If one file found, confirm with the user: "Found `<filename>`. Share this game?"
   - If multiple files found, list them and ask the user which one to share.

3. **Read the file** and extract the `gameId` from the `THEME` object. Look for a line matching `gameId:` followed by a quoted UUID string. If no gameId is found, tell the user the file doesn't appear to be a bored runner game.

4. **Upload** — Run the following curl command:
   ```
   curl -s -X POST https://www.bored.run/api/games/upload \
     -H "Content-Type: application/json" \
     -d "$(jq -n --arg html "$(cat <filename>)" --arg gameId "<gameId>" '{gameId: $gameId, html: $html}')"
   ```

5. **Report the result:**
   - On success, tell the user: "Game shared! Play it at: **https://www.bored.run/play/<gameId>**"
   - On error, show the error message from the API response.
