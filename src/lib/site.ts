/** Single source of truth for identity + links, reused across pages, docs, and metadata. */
export const site = {
  name: "QueryForge",
  tagline: "A SQL database engine built from scratch — with the internals on screen.",
  description:
    "QueryForge is a working SQL database I wrote from zero — page-based storage, a B+tree index, a write-ahead log, a hand-written parser, a rule-based planner, and an iterator executor. The playground animates every layer as you type queries: the B+tree splitting, pages flushing, and the plan executing. No ORM. No Postgres underneath.",
  url: "https://queryforge.charanreddy.dev",
  author: {
    name: "Chanda Charan Reddy",
    short: "Charan",
    title: "AI & Automation Engineer",
    location: "Bangalore, India",
    portfolio: "https://www.charanreddy.dev",
    github: "https://github.com/charanreddy-27",
    githubRepo: "https://github.com/charanreddy-27/queryforge",
    linkedin: "https://www.linkedin.com/in/chandacharanreddy/",
    cal: "https://cal.com/charanreddy-27/30min",
    email: "charanreddychanda@gmail.com",
    orcid: "https://orcid.org/0009-0003-2414-6717",
  },
  /** LinkedIn post about this project — placeholder until published. */
  linkedinPost: "",
} as const;
