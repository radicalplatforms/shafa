'use client'

import {useAuth0} from "@/utils/useAuth0";
import {useSearchParams} from 'next/navigation'

export default async function Home() {
  await useAuth0(useSearchParams(), false)
  return (
    <h1>Shafa</h1>
  );
}
