# Muhammad Shafique Portfolio

Responsive portfolio with 18 starter projects, category filters, search, a CV download, and a password-protected project dashboard at `/admin`. The dashboard can add projects, edit their details, and hide or republish them. Projects can use an optional hosted cover image.

## Preview locally

1. Install Node.js 24.
2. Open a terminal in the extracted folder and run `npm run dev`.
3. Open [http://localhost:3000](http://localhost:3000). The public portfolio runs with the starter projects immediately.
4. To test the dashboard locally, copy `.env.example` to `.env.local`, set the values described below, then restart the server. Use a separate Redis database if you want a test environment that does not change your published projects.

## Deploy from GitHub to Vercel

1. Extract the ZIP. Upload the **contents** of the extracted folder to a GitHub repository, including `vercel.json`, `api/`, and `public/`. Review the contact details in the included CV before making the repository public.
2. Create an [Upstash Redis](https://console.upstash.com/) database for this portfolio. From its REST API tab, copy the REST URL and token with write access.
3. In Vercel, add a project and import the GitHub repository. Use the root folder, the **Other** framework preset, and no custom build command. The output directory is set to `public` in the included configuration.
4. Set these three Vercel environment variables for Production before deploying. If the site is already deployed, redeploy after adding them.

| Variable | Value |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Your Upstash Redis HTTPS REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash Redis REST write token |
| `ADMIN_PASSWORD` | A unique password of at least 16 characters |

5. Open `https://YOUR-PROJECT.vercel.app/admin` and sign in. Add a project or select **Edit** next to an existing one. Save the project, then reload the public portfolio to see the update.

Keep your password and Redis credentials in Vercel environment variables or your ignored local `.env.local` file. Saved projects live in Redis, so keep the same production database connected across deployments. The project links and labels are based on the supplied portfolio.

[Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json) · [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js) · [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)
