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
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
