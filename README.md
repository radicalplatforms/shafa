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

```mermaid
erDiagram
    items {
        String id
        String name
        String brand
        String photo
        Enum<String> type
        Int rating
        String created_at
        String author_username
    }

    outfits {
        String id
        Int rating
        String wear_date
        String author_username
    }

    items_to_outfits {
        String item_id
        String outfit_id
        Enum<String> item_type
    }

    items ||--|{ items_to_outfits : "has outfits"
    outfits ||--|{ items_to_outfits : "has items"
```
    
#### Local Setup

Clone the project (using https, ssh, or Github CLI).
Navigate to the hono directory and install backend dependencies using `npm`:

```
cd shafa/hono
npm i
```

#### Running a Live Development Backend

In order to run the backend, you'll need to get a [Neon](https://neon.tech) database setup (it's free, for what we'll
need). If you don't have an account already, follow the [sign up instructions](https://neon.tech/docs/get-started-with-neon/signing-up). Make sure the Postgres version is 16, the project and database name can be whatever you'd like.

Now, head back over to this repo on your local machine and copy the `.dev.vars.example` file. Paste and rename as
`.dev.vars`. Open the `.dev.vars` file using a text editor/IDE. Copy the full connection string (no pooling) in the Neon Console and paste it as the value for `DATABASE_URL=` (should look something like `DATABASE_URL=postgresql://rak3rman:<PASSWORD>@<HOST>.aws.neon.tech/<DB-NAME>?sslmode=require`). This new `.dev.vars` file is considered a secret — make sure this file is never included in a commit. We're done with the Neon Console for the time being.

Now we have to migrate the Neon Postgres database. To migrate/setup Neon, run the following:

```
npm run migrate
```

NOTE: You'll also have to run this command each time a migration file is added to the backend database.

We're ready to run the backend! To run the project locally using `wrangler` (a local, simplified version of Cloudflare Workers), run the following on the command line:

```
npm run dev
```

You should now be able to interface with the backend!
Check out the [wrangler docs](https://developers.cloudflare.com/workers/wrangler/commands/#d1) for additional
information.

A few other useful backend commands available in `package.json`:

```
npm run generate  # creates a new database migration automatically based on the defined schema
npm run format    # attempts to fix formatting errors, throws eslint warns/errors
```

#### Running Tests

In order to run tests locally using `npm run test`, you'll need to have a v16 [Postgres](https://www.postgresql.org)
database installed on your machine. [Neon](https://neon.tech) (the serverless v16 Postgres database we use in
production) is billed per query, so running test cases against Neon (which may contain 100's of queries) can get
expensive really fast. Instead, we leverage a local instance of Postgres which acts in a nearly identical manner to
Neon.

Installing a v16 instance of Postgres *should* be trivial:

On Mac:
```
brew install postgresql@16
```
You might also have to add `export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"` to your `~/.zshrc` to resolve
paths.

On Ubuntu:
```
# Add Postgres 16 Repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
# Import Signing Key
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
# Update and Install
sudo apt update
sudo apt install postgresql@16
```

If you are using a different OS or running into issues, a bit of digging on Google may be needed to install v16
Postgres. If the install is faulty, you'll run into errors when running the test script below. Inspect the errors
and open a discussion in this repo if needed. A good resource to consult is the `hono/test/utils/db.ts` script.

Now that Postgres is (hopefully) ready to go, give the test script a shot:

```
npm run test
```

This script will run all test cases that can be run in a local testing environment.

A few other useful testing commands available in `package.json`:

```
npm run test:smoke        # runs smoke tests only
npm run test:unit         # runs unit tests only
npm run test:integration  # runs integration tests only
npm run test:preflight    # runs preflight tests only

npm run check-ts          # checks that hono can build all ts files
npm run check-prettier    # checks prettier formatting constraints (no fix)
npm run check-eslint      # checks eslint formatting constraints (no fix)
```

Custom sets of test cases are run manually as apart of the continious integration / continous deployment (CI/CD)
pipeline. These configurations can be seen in `.github/workflows/hono*`.

## Team

- **Radison Akerman** // Manager & Individual Contributor, Fullstack
- **Vincent Do** // Individual Contributor, Backend

## License
This project (shafa) is protected by the Mozilla Public License 2.0 as disclosed in the [LICENSE](https://github.com/rak3rman/shafa/blob/main/LICENSE). Adherence to the policies and terms listed is required.