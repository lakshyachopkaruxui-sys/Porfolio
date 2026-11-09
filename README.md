# Lakshya portfolio — Cloudflare Pages

This is the clean generated publishing repository for both Normal and Play. Keep the local workspace and its source files separately. Do not edit generated pages here.

Cloudflare Pages settings: framework None; production branch main; build command npm run build; build output public; Node 22. The functions directory is server-side and must remain outside public. The Pages project name lakshyachopkar and https://lakshyachopkar.com/ are proposed until Cloudflare confirms availability.

Set PUBLIC_ORIGIN to the final HTTPS origin in both production build/runtime settings. GOOGLE_SITE_VERIFICATION is an optional public Search Console token. GEMINI_API_KEY is an optional production-only secret; without it the portfolio works and the live assistant reports unavailable. Do not put secrets in this repository.

Future local source changes: run node production/build-cloudflare.mjs and node production/verify-cloudflare.mjs from the original workspace, then commit and push this folder to the same GitHub repository and production branch. Rebuilds preserve this folder's .git history. Cloudflare deploys successful pushes to the same production URL. Use the root production URL on your résumé, never a preview or commit-specific URL. Keep the same Pages project.

Full owner setup, Google verification, update and rollback instructions are in docs/cloudflare-publishing-guide.md in the original workspace. Current source config is production/cloudflare.config.json. Preserve that config when changing source. The root URL redirects to /normal-portfolio/; all existing Normal and Play paths remain usable.

This folder is prepared locally; no account, domain, deployment or Google indexing has been created or verified.
