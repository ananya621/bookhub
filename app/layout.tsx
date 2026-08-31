import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
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
      <body>{children}</body>
    </html>
  );
}
