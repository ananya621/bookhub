import type { CSSProperties } from "react";

/*
 * The tag colours for a review's moderation status, shared by the
 * Reviews queue and the per-reader admin page so the same status can't
 * end up two different colours on two screens.
 *
 * `pending` doubles as the "currently reported" colour — a review with
 * open reports is shown in it whatever its stored status is.
 */
export const REVIEW_STATUS_STYLE: Record<string, CSSProperties> = {
  allowed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  deleted: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
};
