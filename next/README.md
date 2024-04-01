This is a [Next.js](https://nextjs.org/) project bootstrapped
with [`c3`](https://developers.cloudflare.com/pages/get-started/c3).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Cloudflare integration

Besides the `dev` script mentioned above `c3` has added a few extra scripts that allow you to integrate the application
with the [Cloudflare Pages](https://pages.cloudflare.com/) environment, these are:

- `pages:build` to build the application for Pages using
  the [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages) CLI
- `preview` to locally preview your Pages application using
  the [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI

> __Note:__ while the `dev` script is optimal for local development you should preview your Pages application as well (
> periodically or before deployments) in order to make sure that it can properly work in the Pages environment (for more
> details see
> the [`@cloudflare/next-on-pages` recommended workflow](https://github.com/cloudflare/next-on-pages/blob/05b6256/internal-packages/next-dev/README.md#recommended-workflow))
