'use client'

import {createAuth0Client} from "@auth0/auth0-spa-js";
import {redirect} from "next/navigation";
import {revalidateTag} from "next/cache";

export const getAuth0 = async () => {
  // Create a new instance of Auth0 Client
  let auth = await createAuth0Client({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: process.env.URL_BASE_FRONTEND + process.env.AUTH0_REDIRECT_URL,
    },
    cacheLocation: "localstorage",
    audience: "https://rakerman.us.auth0.com/api/v2/",
  });
  // Fetch isAuth, userAuth0, and token
  const isAuth = await auth.isAuthenticated();
  const userAuth0 = isAuth ? await auth.getUser() : undefined;
  const token = isAuth ? await auth.getTokenSilently() : undefined;
  // Fetch userAuthor
  const userAuthor = await fetch("https://api.author.rakerman.com/api/auth0/user", {
    method: "GET",
    headers: {
      // auth headers
      Authorization: "Bearer " + token,
    },
    next: {
      tags: ['userAuthor']
    }
  });
  // Check if user is complete in Author, redirect to Author if so
  if (userAuthor.ok && !userAuthor.json()?.complete) {
    return redirect("https://author.rakerman.com/profile");
  }
  // Clear cache from Author if token is null
  if (token === undefined) {
    revalidateTag('userAuthor')
  }
  // Return
  return {auth, isAuth, token, userAuth0, userAuthor};
};