import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { ConvexReactClient } from 'convex/react'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
  convexClient: ConvexReactClient
}>()({
  beforeLoad: async ({ context, location }) => {
    const { userId, token } = await getServerAuth()
    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token)
    }

    const isAuthRoute = location.pathname.startsWith('/sign-in') || location.pathname.startsWith('/sign-up')
    if (!userId && !isAuthRoute) {
      throw redirect({
        to: '/sign-in/$',
        params: {
          _splat: '',
        },
      })
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
})

function RootComponent() {
  const context = Route.useRouteContext()
  return (
    <RootDocument>
      <ClerkProvider>
        <AuthReadyShell convexClient={context.convexClient} />
      </ClerkProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

const getServerAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const serverAuth = await auth()
  const token = await serverAuth.getToken({ template: 'convex' })
  return {
    userId: serverAuth.userId,
    token,
  }
})

function AuthReadyShell({ convexClient }: { convexClient: ConvexReactClient }) {
  const { isLoaded } = useAuth()
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <Outlet />
    </ConvexProviderWithClerk>
  )
}
