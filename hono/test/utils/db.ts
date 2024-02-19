import { start, stop } from '@shelf/postgres-local'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export async function startPostgres() {
  await start({
    version: 16,
    port: 5555,
    debugMode: false,
  })

  const migrationClient = postgres('postgres://localhost:5555/postgres', {
    max: 1,
  })

  await migrate(drizzle(migrationClient), { migrationsFolder: './src/drizzle' })
}

export async function stopPostgres() {
  stop({ version: 16, debugMode: false })
}
