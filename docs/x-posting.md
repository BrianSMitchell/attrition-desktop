# X Posting CLI (Manual) — tools/python/x_post.py

This script lets you manually publish the "Suggested X Post" text when you decide to post. It follows the social media rule (no auto-posting) and reads credentials from environment variables. Dry-run is the default; use --live to actually post.

## Requirements

- Python 3.9+
- Install dependencies once:
  - On Windows PowerShell:
    ```powershell
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r tools/python/requirements.txt
    ```

## Credentials (do not commit secrets)

- Required environment variables:
  - X_API_KEY
  - X_API_SECRET
  - X_ACCESS_TOKEN
  - X_ACCESS_TOKEN_SECRET

Optionally use a local .env with placeholders (never commit real secrets) and pass --use-dotenv.

Example .env (placeholders only):
```dotenv
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

Ensure .env is in .gitignore.

## Usage (PowerShell-safe)

- Dry run (default):
  ```powershell
  $env:X_API_KEY="..." ; $env:X_API_SECRET="..." ; $env:X_ACCESS_TOKEN="..." ; $env:X_ACCESS_TOKEN_SECRET="..."
  python tools/python/x_post.py --message "Attrition update 🚀 #AttritionGame #SpaceEmpire"
  ```

- Live post (be careful):
  ```powershell
  $env:X_API_KEY="..." ; $env:X_API_SECRET="..." ; $env:X_ACCESS_TOKEN="..." ; $env:X_ACCESS_TOKEN_SECRET="..."
  python tools/python/x_post.py --message "Attrition update 🚀 #AttritionGame #SpaceEmpire" --live
  ```

- Read message from stdin:
  ```powershell
  "Hello galaxy 🌌 #AttritionGame #SpaceEmpire" | python tools/python/x_post.py --stdin --live
  ```

- Read message from file:
  ```powershell
  python tools/python/x_post.py --from-file docs/post.txt --live
  ```

- Attach media (1–4 files):
  ```powershell
  python tools/python/x_post.py --message "Screenshots!" --media path\to\img1.png --media path\to\img2.jpg --live
  ```

- Use .env:
  ```powershell
  python tools/python/x_post.py --message "Text" --use-dotenv
  ```

## Behavior & Validations

- Enforces ≤ 280 characters (simple counter); warns if #AttritionGame or #SpaceEmpire are missing (non-blocking).
- Dry-run prints what would be posted along with length and media count.
- Live mode posts via Tweepy (v2 create_tweet + v1.1 media upload) and prints the tweet URL.

## Notes

- Never commit real credentials. Keep secrets in env or a secure secret manager.
- If any keys or tokens were exposed elsewhere, rotate them before using this tool.
- Frequency guardrails (1–2/week, >=4 days apart) are managed by your .clierules process; this CLI only executes when you choose to post.

---

## OAuth2 User Authorization (Recommended for posting)

The CLI supports an OAuth 2.0 (User Context) flow to post text tweets using an access token (no media). This avoids storing long‑lived OAuth1 user tokens.

### One‑time setup (get access token)

1) Ensure your X App has these settings:
   - Redirect URI: http://127.0.0.1:8765/callback
   - Scopes: tweet.read, tweet.write, users.read, offline.access

2) Put your OAuth2 client credentials in .env (placeholders shown; do not commit real values):
```dotenv
X_OAUTH2_CLIENT_ID=
X_OAUTH2_CLIENT_SECRET=
X_OAUTH2_REDIRECT_URI=http://127.0.0.1:8765/callback
```

3) Run the initializer (PowerShell-safe):
```powershell
$env:OAUTHLIB_INSECURE_TRANSPORT="1"; .\.venv\Scripts\python tools\python\x_post.py --oauth2-init --use-dotenv
```

- Open the printed URL, authorize, then paste the full redirected URL (or just the code).
- The tool writes X_OAUTH2_ACCESS_TOKEN (and X_OAUTH2_REFRESH_TOKEN if present) to .env.

### Post with OAuth2 (text-only)

```powershell
.\.venv\Scripts\python tools\python\x_post.py --message "Hello World! #AttritionGame #SpaceEmpire" --use-dotenv --oauth2 --live
```

- Add --verbose to see request diagnostics.
- Media is not supported via OAuth2 path; for media use the default OAuth1 path.

### Troubleshooting

- 401 Unauthorized:
  - Re-run --oauth2-init to obtain a fresh token.
  - Verify your app scopes include: tweet.read, tweet.write, users.read, offline.access.
  - Ensure .env contains a current X_OAUTH2_ACCESS_TOKEN.

- "Consumer key must be string or bytes, not NoneType":
  - This can occur if a library tries to use OAuth1 params for an OAuth2 call.
  - Update dependencies and use the --oauth2 flag; the CLI performs a direct HTTPS POST with your OAuth2 token.
  - Reinstall requirements to ensure "requests" is available:
    ```powershell
    .\.venv\Scripts\python -m pip install -r tools\python\requirements.txt
    ```

- PowerShell syntax:
  - Avoid Unix-style && chaining. Use semicolons and $env:VAR="..." as shown above.
