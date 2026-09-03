import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import ProjectBanner from "@/components/ProjectBanner";
import { getCurrentUser } from "@/lib/auth";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved once, on the server, and handed to client components through
  // AuthProvider. Client components must not work this out themselves —
  // see the note in components/AuthProvider.tsx.
  const user = await getCurrentUser();

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
        <AuthProvider user={user}>
          {/* Above everything, including the nav and the unverified
              banner, and on the chrome-less auth screens too. */}
          <ProjectBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
