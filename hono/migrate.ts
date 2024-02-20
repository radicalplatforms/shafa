import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

config({ path: '.dev.vars' })

const db = drizzle(postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 }))

const main = async () => {
  await migrate(db, { migrationsFolder: './src/drizzle' })
  process.exit(0)
}

main().then()
