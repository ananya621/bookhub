/*
 * Thin notice above every page: this is a student project, not a real
 * service.
 *
 * It lives in the root layout rather than in Nav, deliberately. Nav only
 * renders on nine screens, and the ones it skips are the auth screens —
 * signup, login, verify, password reset — which are exactly where
 * someone is being asked for an email and a password, and so exactly
 * where the notice matters most.
 *
 * Unlike the dev persona switcher this is NOT development-only. It
 * matters most in production, where someone could find the site without
 * any of the context a marker gets.
 *
 * Not dismissible: it is one line, and a notice that can be closed
 * before the signup form is a notice that will be.
 *
 * Not part of the design export. Remove it if this ever stops being
 * coursework — and if that happens, the COPPA/GDPR-K question in
 * docs/auth-api-design.md has to be answered first, because it is
 * deferred on the basis that this banner is here.
 */
export default function ProjectBanner() {
  return (
    <div
      className="mono"
      style={{
        // Deliberately not one of the state colours. The design system
        // uses colour to mean state (pink = unverified, red = error);
        // this is permanent chrome, not a state, so it takes the plain
        // ink-on-paper inversion instead of stealing a state colour.
        background: "var(--color-text)",
        color: "var(--color-bg)",
        padding: "5px 28px",
        textAlign: "center",
        fontWeight: 700,
        lineHeight: 1.4,
      }}
    >
      COURSEWORK DEMO — NOT A REAL SERVICE. PLEASE DON&apos;T REUSE A PASSWORD FROM
      ANOTHER SITE.
    </div>
  );
}
