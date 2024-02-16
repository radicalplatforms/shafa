# Shafa
A wardrobe logging, composition, and organization app

> [!IMPORTANT]
> Shafa is in active development towards our first stable release (v1.0.0). Things may break unexpectedly.

## Purpose

Shafa makes wardrobe logging, composition, and organization easy.

We built Shafa on the following principles:

- Deciding what to wear throughout the day should be frictionless
- Simplicity is key, remove the need for extra bells and whistles
- Onboarding a closet needs to be ultrafast and easy, collect as few data points as possible
- Don't suggest new outfits, leverage past decisions and provide clear metrics
- User interface needs to be slick and intuitive, minimal learning curve and clicks

## Stack Overview

Shafa is a state-of-the-art full-stack web application.
We built the Shafa backend on [Hono](https://hono.dev), a ultrafast web framework that leverages the power of Cloudflare Workers.
The Shafa frontend is still up in the air (we are eyeing native iOS, Next.js, and Nuxt) — stay tuned.

Get started using the documentation below for each respective stack.

### Hono (Backend)

#### Database Schema

erDiagram
    items {
        Int id
        String name
        String brand
        String photo
        Int type
        Int rating
        String timestamp
        Int author_username
    }

    outfits {
        Int id
        Int rating
        String wearDate
        String author_username
    }

    items_to_outfits {
        Int item_id
        Int outfit_id
        Int item_type
    }

    items ||--|{ items_to_outfits : "has outfits"
    outfits ||--|{ items_to_outfits : "has items"
    
#### Local Setup

Clone the project (using https, ssh, or Github CLI).
Navigate to the hono directory and install backend dependencies using `npm`:

```
cd shafa/hono
npm i
```

In order to run the backend, you'll need to get your [Cloudflare D1](https://developers.cloudflare.com/d1/) database setup locally (unless you have creds to access the remote D1 db).
To migrate/setup your local db, run the following and accept the prompts:

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
wrangler login               // logs you into Cloudflare, you may have to run
                             // `npm i -g wrangler` to install wrangler globally

npm run wrstage              // deploys the current local build to the stage environment
npm run wrprod               // deploys the current local build to the production environment

npm run wrdev-migrate        // migrates the local and remote development databases
npm run wrdev-migrate-remote // ONLY migrates the remote development database
npm run wrstage-migrate      // migrates the remote stage database
npm run wrprod-migrate       // migrates the remote production database
```

In `npm run wrdev`, you can also access/manipulate the remote database instance by pressing `l`.
Be careful when manipulating and migrating the remote database instance — reserve this for when your local db isn't working properly or you'd like to share a database with others who also have creds.
Be particularly careful with the `wrstage*` and `wrprod*` commands, they are potentially destructive actions and will not ask you to confirm your deployment/migration changes.
On this same token, consider the dev remote database instance volatile, and the stage and production instances stable.

## Team

- **Radison Akerman** // Manager & Individual Contributor, Fullstack
- **Vincent Do** // Individual Contributor, Backend

## License
This project (shafa) is protected by the Mozilla Public License 2.0 as disclosed in the [LICENSE](https://github.com/rak3rman/shafa/blob/main/LICENSE). Adherence to the policies and terms listed is required.