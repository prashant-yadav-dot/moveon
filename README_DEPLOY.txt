MoveOn — Ex Roleplay FINAL FIXED

1. Upload the contents of this ZIP to the ROOT of your GitHub repository.
   The repository root should contain:
   - worker.js
   - wrangler.jsonc
   - Moveon/

2. Do NOT create another moveon_final/ or ZIP folder around these files.

3. Cloudflare Workers:
   - GitHub integration should deploy with: npx wrangler deploy
   - wrangler.jsonc already points to ./worker.js
   - Static website files are served from ./Moveon

4. IMPORTANT:
   OPENAI_API_KEY must remain saved as a Cloudflare Worker Secret.
   Never put the key inside HTML, JavaScript, GitHub, or this ZIP.

5. Ex Roleplay endpoint:
   POST /api/ex-roleplay

6. This final package:
   - fixes the Ex Roleplay frontend error handling so backend/API errors are visible
   - uses the main worker.js endpoint
   - keeps the selected fictional ex name
   - keeps recent chat history
   - removes the duplicate ex-roleplay-worker.js
   - preserves the rest of the MoveOn website files

After deployment, open:
https://moveon.shanydv001.workers.dev/ex-roleplay.html
