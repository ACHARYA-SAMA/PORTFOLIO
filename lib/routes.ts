/** The classic portfolio lives here; `/` is the playable world. */
export const PORTFOLIO = "/portfolio";

export const workHref = (id: string) => `${PORTFOLIO}/work/${id}`;
export const sectionHref = (id: string) => `${PORTFOLIO}#${id}`;
