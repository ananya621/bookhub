import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /*
       * Book covers go up through a Server Action, and those cap the
       * request body at 1MB by default — which a photograph of a book
       * comfortably exceeds. Production was answering 413 "Body
       * exceeded 1 MB limit" on the admin catalogue's upload, which
       * surfaces to the admin as a bare internal error.
       *
       * 5MB, and the actions refuse anything over 4MB themselves with a
       * readable message (see app/actions/books.ts). The gap between
       * the two is deliberate: the limit here applies to the whole raw
       * multipart body — every other field on the form, plus the
       * boundaries and part headers multipart adds — so a file that is
       * exactly at the limit still arrives slightly larger than the
       * file itself.
       */
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
