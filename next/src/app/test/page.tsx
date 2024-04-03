import {AppType} from '../../../../hono/src/index'
import {hc} from 'hono/client'
import type {InferResponseType} from 'hono/client'

export default async function Page() {
  const client = hc<AppType>('http://localhost:8787/')

  // @ts-ignore
  const $get = client.api.items.$get({
    query: {
      page: 0,
      size: 10
    }
  })

  const d = await $get

  type ResType = InferResponseType<typeof $get>

  const data: ResType = await d.json()

  return (
    <div className="bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="bg-gray-900 py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h1 className="text-base font-semibold leading-6 text-white">Items</h1>
                <p className="mt-2 text-sm text-gray-300">
                  A list of all items for the default user.
                </p>
              </div>
            </div>
            <div className="mt-8 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">
                        ID
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Brand
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Rating
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Created At
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Username
                      </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                    {data.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                          {item.id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{item.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{item.brand}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{item.type}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{item.rating}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{item.createdAt}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{item.authorUsername}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
