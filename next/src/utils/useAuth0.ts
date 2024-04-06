'use client'

import {getAuth0} from "@/utils/getAuth0";
import {ReadonlyURLSearchParams} from "next/navigation";

export const useAuth0 = async (searchParams: ReadonlyURLSearchParams, enforce: Boolean) => {
  let {auth, isAuth, token, userAuth0, userAuthor} = await getAuth0()
  // Whenever this function is called, check if user is authenticated
  if (!(await auth.isAuthenticated())) {
    // NOT authorized, lets see if they are in a callback from Auth0
    if (searchParams && searchParams.has('code') && searchParams.has('state')) {
      // Callback params present, let plugin handle validation
      await auth.handleRedirectCallback()
    } else {
      // No callback params, check if we should enforce auth
      if (enforce) {
        // Enforce auth, redirect to Auth0
        await auth.loginWithRedirect()
        // return abortNavigation('Unauthorized, redirecting to Auth0...')
      }
      // User is NOT authorized, but we don't care, let them keep doing what they wanted
    }
  }
  // User IS authorized, allow them to keep doing what they wanted
}