import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Albert — chat with your research papers" },
      { name: "description", content: "Upload a paper, ask anything. Albert is an AI research companion powered by IBM watsonx." },
      { name: "author", content: "Albert" },
      { property: "og:title", content: "Albert — chat with your research papers" },
      { property: "og:description", content: "Upload a paper, ask anything. Albert is an AI research companion powered by IBM watsonx." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Albert — chat with your research papers" },
      { name: "twitter:description", content: "Upload a paper, ask anything. Albert is an AI research companion powered by IBM watsonx." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/edc1808b-321f-46f5-b9b8-738501bf3594/id-preview-320e2a79--9b35fe1f-e7b9-4fd0-b6cf-9699d768b75a.lovable.app-1777726366959.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/edc1808b-321f-46f5-b9b8-738501bf3594/id-preview-320e2a79--9b35fe1f-e7b9-4fd0-b6cf-9699d768b75a.lovable.app-1777726366959.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Toaster />
    </>
  );
}
