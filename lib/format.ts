/** Zero-pad: 7 -> "07". Safe on server and client. */
export const pad = (n: number, width = 2) => String(n).padStart(width, "0");
