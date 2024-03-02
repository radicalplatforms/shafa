import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { itemsExtended } from './src/schema'

config({ path: '.dev.vars' })

const main = async () => {
  const db = drizzle(postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 }))
  await migrate(db, { migrationsFolder: './src/drizzle' })
  await db.refreshMaterializedView(itemsExtended)
  process.exit(0)
}

main().then()
