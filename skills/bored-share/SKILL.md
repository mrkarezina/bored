---
name: bored-share
description: Upload a locally generated /bored runner game so it is playable at a public bored-claude.vercel.app URL that can be sent to friends.
when_to_use: /bored-share, "share my game", "put this game online", "get a link for the game"
allowed-tools: Read, Glob, Bash(curl *), Bash(jq *)
model: haiku
---

# /bored-share

Upload a local game HTML file so it is playable at a public URL.

## Steps

1. **Find the game.** Glob `*.html` in the current directory, not recursive.
   - None found: tell the user to generate one first with `/bored`.
   - One found: confirm before uploading — "Found `<filename>`. Share this game?"
   - Several found: list them and ask which.

2. **Extract the `gameId`.** Read the file and find the `gameId:` line inside the `THEME`
   object — a quoted UUID. If there is none, the file is not a /bored runner game; say so and
   stop.

3. **Upload.**

   ```
   curl -s -X POST https://bored-claude.vercel.app/api/games/upload \
     -H "Content-Type: application/json" \
     -d "$(jq -n --arg html "$(cat <filename>)" --arg gameId "<gameId>" '{gameId: $gameId, html: $html}')"
   ```

4. **Report.** On success: "Game shared! Play it at
   **https://bored-claude.vercel.app/play/`<gameId>`**". On error, show the API's message.

Uploading publishes the game to a public URL, so always confirm with the user in step 1 before
running the upload.
