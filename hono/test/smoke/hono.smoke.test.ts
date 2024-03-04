import { version } from '../../package.json'
import app from '../../src/index'

/**
 * Hono Smoke Tests
 *
 * Smoke testing, also known as 'build verification testing', is a type of
 * software testing that comprises a non-exhaustive set of tests that aim at
 * ensuring that the most critical functions work. The result of this testing is
 * used to decide if a build is stable enough to proceed with further testing.
 *
 * Here we are testing hono to make sure that it compiles and returns expected
 * output, this is a trivial test.
 */

describe('[Smoke] Hono: ensure hono is functioning as expected', () => {
  test('GET /: should be invalid request', async () => {
    const res = await app.request('')
    expect(res.status).toBe(500)
    expect(await res.text()).toEqual('Internal Service Error')
  })

  test('GET /: should return api version', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toEqual(`Shafa API v${version}`)
  })
})
