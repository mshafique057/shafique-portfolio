# Muhammad Shafique Portfolio V4

A responsive portfolio with 18 projects, category filters, search, a CV download, and direct WhatsApp, phone, email, and LinkedIn links. The dashboard at `/admin` can add projects, edit their details, and hide or republish them.

## Run V4 on your computer

1. Install Node.js 24.
2. Open the extracted folder in a terminal and run `npm run dev`.
3. Open [the portfolio](http://localhost:3000) or [the admin page](http://localhost:3000/admin).
4. The temporary local password is the last seven digits of the phone number displayed on the portfolio. Local project edits persist in `.portfolio-local.sqlite` and use no Upstash credentials. Local data stays on the computer running the preview.

## Update the GitHub and Vercel deployment

1. Replace the previous source files in the GitHub repository with the extracted contents, including `api/`, `public/`, and `vercel.json`.
2. Keep the same Upstash Redis database to preserve any existing production edits. If you have no database yet, create one in [Upstash](https://console.upstash.com/) and copy its HTTPS REST URL and REST token with write access.
3. Open the Vercel project. Use the **Other** framework preset and the repository folder containing `package.json` as the root. The included config sets `public` as the output directory.
4. Under **Settings → Environment Variables**, add these values for the environment you deploy to.

| Variable | Value |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash HTTPS REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token with write access |
| `ADMIN_PASSWORD` | A unique production password with at least 16 characters |

   V4 also recognises the matching `KV_REST_API_URL` and `KV_REST_API_TOKEN` pair from an existing Vercel integration. Keep secrets in Vercel or in an ignored local `.env.local` file.

5. Deploy the new commit after any environment changes. Open `https://YOUR-PROJECT.vercel.app/admin` and sign in with your production password. Save a project and reload the public portfolio to check the result.

## If the admin reports a database error

- **Missing setup**. Check that the URL and write token are a matching pair and selected for the deployment environment you opened. Redeploy after saving changes.
- **Credentials rejected**. Copy the REST token from the same Upstash database as the URL and verify that the token has write access.
- **Connection unavailable or rate limited**. Check the database status and usage in Upstash and the function logs in Vercel.
- **Missing API route**. Verify that GitHub contains the root `api/projects.js` file and that Vercel is deploying from that root.

[Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables) · [Upstash REST API](https://upstash.com/docs/redis/features/restapi)
