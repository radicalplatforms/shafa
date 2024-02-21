import { execSync } from 'child_process'
import fs from 'fs'
import { platform } from 'os'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const TEMP_ROOT = `tmp-postgres-local`

export async function start(
  port: number = 5555,
  version: number = 16,
  includeInstallation: boolean = false
): Promise<void> {
  try {
    execSync(getInstallationScript(port, version, includeInstallation))
  } catch (e) {
    stop(port, version)
    throw e
  }
}

export async function provision(name: string, port: number = 5555, version: number = 16) {
  const url = `postgres://localhost:${port}/${name}`

  try {
    execSync(getCreateDbScript(name, port))
    const client = postgres(url, {
      max: 1,
    })
    await migrate(drizzle(client), { migrationsFolder: './src/drizzle' })
  } catch (e) {
    stop(port, version)
    throw e
  }
}

export async function clean(name: string, port: number = 5555, version: number = 16) {
  const url = `postgres://localhost:${port}/${name}`

  try {
    const client = postgres(url)
    const db = drizzle(client)

    const sqlString = fs.readFileSync('test/utils/clean-db.sql', 'utf8')
    await db.execute(sql.raw(sqlString))
  } catch (e) {
    stop(port, version)
    throw e
  }
}

export async function seed(
  name: string,
  seeds: string[],
  port: number = 5555,
  version: number = 16
) {
  const url = `postgres://localhost:${port}/${name}`

  try {
    const client = postgres(url)
    const db = drizzle(client)

    for (const seed of seeds) {
      const sqlString = fs.readFileSync('test/utils/seeds/' + seed, 'utf8')
      await db.execute(sql.raw(sqlString))
    }
  } catch (e) {
    stop(port, version)
    throw e
  }
}

export function stop(port: number = 5555, version: number = 16): void {
  execSync(getStopScript(port, version))
}

function getInstallationScript(
  port: number,
  version: number,
  includeInstallation: boolean
): string {
  switch (platform()) {
    case 'darwin': {
      const installation = includeInstallation ? `brew install postgresql@${version};` : ''

      return `
       ${installation}
       mkdir -p ${TEMP_ROOT}/data;
       initdb -D ${TEMP_ROOT}/data;
       pg_ctl -D ${TEMP_ROOT}/data -o "-F -p ${port}" -l ${TEMP_ROOT}/logfile start;
      `
    }
    case 'win32': {
      throw new Error('Unsupported OS, try to run on Mac or Linux')
    }
    default: {
      const installation = includeInstallation
        ? `sudo apt update; sudo apt install postgresql-${version};`
        : ''

      return `
        ${installation}
        mkdir -p ${TEMP_ROOT}/data;
        /usr/lib/postgresql/${version}/bin/initdb -D ${TEMP_ROOT}/data;
        sudo chmod 2777 /var/run/postgresql;
        /usr/lib/postgresql/${version}/bin/pg_ctl -o "-F -p ${port}" -D ${TEMP_ROOT}/data -l ${TEMP_ROOT}/logfile start;
      `
    }
  }
}

function getCreateDbScript(name: string, port: number): string {
  switch (platform()) {
    case 'darwin': {
      return `
        createdb -p ${port} ${name}
      `
    }
    default: {
      return `
        createdb -p ${port} ${name};
      `
    }
  }
}

function getStopScript(port: number, version: number): string {
  switch (platform()) {
    case 'darwin': {
      return `
         pg_ctl stop -D ${TEMP_ROOT}/data
         rm -rf ${TEMP_ROOT}
      `
    }
    default: {
      return `
        /usr/lib/postgresql/${version}/bin/pg_ctl stop -D ${TEMP_ROOT}/data
        rm -rf ${TEMP_ROOT}
      `
    }
  }
}
