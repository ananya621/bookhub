import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import DevPersonaSwitcher from "@/components/DevPersonaSwitcher";
import { SESSION_COOKIE, getCurrentUser } from "@/lib/auth";
import { PERSONAS, isPersonaId, type PersonaId } from "@/lib/personas";

export const metadata: Metadata = {
  title: "Book Hub",
  description: "Find your next book — recommendations, reviews and a reading tracker.",
};

// Reads the saved theme before paint so the page doesn't flash light-then-dark
// on reload. Not part of the design export — plumbing for the toggle in Nav.
const themeInitScript = `
  try {
    var t = localStorage.getItem('bookhub-theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
`;

const isDev = process.env.NODE_ENV !== "production";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved once, on the server, and handed to client components through
  // AuthProvider. Client components must not work this out themselves —
  // see the note in components/AuthProvider.tsx.
  const user = await getCurrentUser();

  // Only for showing which persona is active in the dev switcher.
  const raw = (await cookies()).get(SESSION_COOKIE)?.value ?? "guest";
  const persona: PersonaId = isPersonaId(raw) ? raw : "guest";
  const data = PERSONAS[persona].data;

  return (
    // suppressHydrationWarning because themeInitScript above sets
    // data-theme on this element before React hydrates, so the DOM
    // legitimately has an attribute the server HTML didn't. It applies
    // to this element's own attributes only — it does not cascade to
    // children, so real mismatches further down still surface.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {/* key remounts the tree when the persona changes, so pages
            re-seed their local state from the new fixture instead of
            keeping the previous reader's shelves. */}
        <AuthProvider key={persona} user={user} data={data}>
          {children}
          {isDev && <DevPersonaSwitcher current={persona} />}
        </AuthProvider>
      </body>
    </html>
  );
}
