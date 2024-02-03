# Shafa
A wardrobe logging, composition, and organization app

## Purpose

## Stack Overview

### Hono

#### Local Setup

Clone the project (using https, ssh, or Github CLI).
Navigate to the hono directory and install backend dependencies using `npm`:

```
cd shafa/hono
npm i
```

In order to run the backend, you'll need to get your [Cloudflare D1](https://developers.cloudflare.com/d1/) database setup locally (unless you have creds to access the remote D1 db).
To migrate/setup your local db locally, run the following and accept the prompts:

```
npm run wrdev-migrate-local
```

NOTE: You'll also have to run this command each time a migration file is added to the backend database.

To run the project locally using `miniflare` (a local, simplified version of Cloudflare Workers), run the following:

```
npm run wrdev
```

You should now be able to interface with the backend!
Check out the [wrangler docs](https://developers.cloudflare.com/workers/wrangler/commands/#d1) for additional information on how to view/manipulate the D1 database.

#### Running with a Remote D1 Database

Accessing the remote D1 database requires special admin credentials that can be provided by @rak3rman, the repo owner.
Only individuals responsible for *deployment-related activites* will be given creds, as the entire backend can be simulated locally with miniflare.
If you have such creds, what follows are additional commands that you can run:

```
npm run wrstage              // deploys the current local build to the stage environment
npm run wrprod               // deploys the current local build to the production environment

npm run wrdev-migrate        // migrates the local and remote development databases
npm run wrdev-migrate-remote // ONLY migrates the remote development database
npm run wrstage-migrate      // migrates the remote stage database
npm run wrprod-migrate       // migrates the remote production database
```

## Contributors

- **Radison Akerman** // Backend, Frontend, DevOps
- **Vincent Do** // Backend

## License
This project (shafa) is protected by the Mozilla Public License 2.0 as disclosed in the [LICENSE](https://github.com/rak3rman/shafa/blob/main/LICENSE). Adherence to the policies and terms listed is required.