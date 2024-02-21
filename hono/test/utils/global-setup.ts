import { start } from './db'

export default async function () {
  await start(5555, 16, true)
}
