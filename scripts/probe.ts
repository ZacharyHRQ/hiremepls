const candidates: { name: string; ats: "greenhouse" | "lever" | "ashby"; slug: string }[] = [
  // Quant / HFT
  { name: "Susquehanna (SIG)", ats: "greenhouse", slug: "susquehannainternationalgroup" },
  { name: "SIG alt", ats: "greenhouse", slug: "sig" },
  { name: "Tower Research", ats: "greenhouse", slug: "towerresearchcapital" },
  { name: "Tower Research alt", ats: "greenhouse", slug: "towerresearch" },
  { name: "Bridgewater", ats: "greenhouse", slug: "bridgewater" },
  { name: "Bridgewater alt", ats: "greenhouse", slug: "bridgewaterassociates" },
  { name: "Millennium", ats: "greenhouse", slug: "millennium" },
  { name: "Point72", ats: "greenhouse", slug: "point72" },
  { name: "AQR", ats: "greenhouse", slug: "aqr" },
  { name: "AQR Capital", ats: "greenhouse", slug: "aqrcapital" },
  { name: "Belvedere", ats: "greenhouse", slug: "belvederetrading" },
  { name: "Wolverine", ats: "greenhouse", slug: "wolverinetrading" },
  { name: "Headlands Tech", ats: "greenhouse", slug: "headlandstechnologies" },
  { name: "Quadrature", ats: "greenhouse", slug: "quadrature" },
  { name: "Marshall Wace", ats: "greenhouse", slug: "marshallwace" },
  { name: "PDT Partners", ats: "greenhouse", slug: "pdtpartners" },
  { name: "GSA Capital", ats: "greenhouse", slug: "gsacapital" },
  { name: "Man Group", ats: "greenhouse", slug: "mangroup" },
  { name: "Voloridge", ats: "greenhouse", slug: "voloridge" },
  { name: "ExodusPoint", ats: "greenhouse", slug: "exoduspoint" },
  { name: "Walleye", ats: "greenhouse", slug: "walleyecapital" },
  { name: "Schonfeld", ats: "greenhouse", slug: "schonfeld" },
  { name: "Engineers Gate", ats: "greenhouse", slug: "engineersgate" },
  { name: "G-Research", ats: "greenhouse", slug: "gresearch" },
  { name: "Old Mission", ats: "greenhouse", slug: "oldmissioncapital" },
  { name: "Five Rings", ats: "greenhouse", slug: "fiveringscapital" },
  { name: "Group One", ats: "greenhouse", slug: "grouponetrading" },
  { name: "Radix", ats: "greenhouse", slug: "radixtrading" },
  { name: "Cubist (Point72)", ats: "greenhouse", slug: "cubistsystematicstrategies" },

  // Tech (likely intern programs)
  { name: "Stripe", ats: "greenhouse", slug: "stripe" },
  { name: "Databricks", ats: "greenhouse", slug: "databricks" },
  { name: "Anthropic", ats: "greenhouse", slug: "anthropic" },
  { name: "OpenAI", ats: "greenhouse", slug: "openai" },
  { name: "OpenAI ashby", ats: "ashby", slug: "openai" },
  { name: "Coinbase", ats: "greenhouse", slug: "coinbase" },
  { name: "Robinhood", ats: "greenhouse", slug: "robinhood" },
  { name: "Plaid", ats: "greenhouse", slug: "plaid" },
  { name: "Brex", ats: "greenhouse", slug: "brex" },
  { name: "Ramp", ats: "ashby", slug: "ramp" },
  { name: "Discord", ats: "greenhouse", slug: "discord" },
  { name: "Figma", ats: "greenhouse", slug: "figma" },
  { name: "Notion", ats: "greenhouse", slug: "notion" },
  { name: "Vercel", ats: "greenhouse", slug: "vercel" },
  { name: "Linear", ats: "ashby", slug: "linear" },
  { name: "Scale AI", ats: "greenhouse", slug: "scaleai" },
  { name: "Mistral", ats: "ashby", slug: "mistral" },
  { name: "Cursor", ats: "ashby", slug: "anysphere" },
  { name: "Perplexity", ats: "ashby", slug: "perplexity" },
  { name: "Replit", ats: "ashby", slug: "replit" },
  { name: "Cohere", ats: "greenhouse", slug: "cohere" },

  // Tier-2 SaaS / infra
  { name: "Snowflake", ats: "greenhouse", slug: "snowflake" },
  { name: "Snowflake ashby", ats: "ashby", slug: "snowflake" },
  { name: "MongoDB", ats: "greenhouse", slug: "mongodb" },
  { name: "Confluent", ats: "greenhouse", slug: "confluent" },
  { name: "HashiCorp", ats: "greenhouse", slug: "hashicorp" },
  { name: "Cloudflare", ats: "greenhouse", slug: "cloudflare" },
  { name: "Datadog", ats: "greenhouse", slug: "datadog" },
  { name: "GitLab", ats: "greenhouse", slug: "gitlab" },
  { name: "Elastic", ats: "greenhouse", slug: "elastic" },
  { name: "Twilio", ats: "greenhouse", slug: "twilio" },
  { name: "Atlassian", ats: "greenhouse", slug: "atlassian" },
  { name: "Asana", ats: "greenhouse", slug: "asana" },
  { name: "Box", ats: "greenhouse", slug: "box" },
  { name: "Dropbox", ats: "greenhouse", slug: "dropbox" },
  { name: "Zendesk", ats: "greenhouse", slug: "zendesk" },
  { name: "Okta", ats: "greenhouse", slug: "okta" },
  { name: "PagerDuty", ats: "greenhouse", slug: "pagerduty" },
  { name: "Snyk", ats: "greenhouse", slug: "snyk" },
  { name: "Postman", ats: "greenhouse", slug: "postman" },
  { name: "Cribl", ats: "greenhouse", slug: "cribl" },
  { name: "Wiz", ats: "ashby", slug: "wiz" },
  { name: "Sentry", ats: "greenhouse", slug: "sentry" },
  { name: "Retool", ats: "greenhouse", slug: "retool" },
  { name: "Airtable", ats: "greenhouse", slug: "airtable" },
  { name: "Zapier", ats: "greenhouse", slug: "zapier" },
  { name: "Webflow", ats: "greenhouse", slug: "webflow" },
  { name: "Intercom", ats: "greenhouse", slug: "intercom" },
  { name: "Pinterest", ats: "greenhouse", slug: "pinterest" },
  { name: "Reddit", ats: "greenhouse", slug: "reddit" },
  { name: "Snap", ats: "greenhouse", slug: "snap" },
  { name: "Instacart", ats: "greenhouse", slug: "instacart" },
  { name: "DoorDash", ats: "greenhouse", slug: "doordash" },
  { name: "Lyft", ats: "greenhouse", slug: "lyft" },
  { name: "Affirm", ats: "greenhouse", slug: "affirm" },
  { name: "Klaviyo", ats: "greenhouse", slug: "klaviyo" },
  { name: "Toast", ats: "greenhouse", slug: "toasttab" },
  { name: "Rippling", ats: "ashby", slug: "ripplingats" },
  { name: "Rippling alt", ats: "ashby", slug: "rippling" },
  { name: "Gusto", ats: "greenhouse", slug: "gusto" },
];

const url = (c: { ats: string; slug: string }) =>
  c.ats === "greenhouse"
    ? `https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`
    : c.ats === "lever"
    ? `https://api.lever.co/v0/postings/${c.slug}?mode=json`
    : `https://api.ashbyhq.com/posting-api/job-board/${c.slug}`;

const results = await Promise.all(
  candidates.map(async (c) => {
    try {
      const r = await fetch(url(c), { headers: { "User-Agent": "hireme-probe" } });
      if (!r.ok) return { ...c, ok: false, status: r.status, count: 0 };
      const data: any = await r.json();
      const count = c.ats === "lever" ? data.length : data.jobs?.length ?? 0;
      return { ...c, ok: true, status: r.status, count };
    } catch (e) {
      return { ...c, ok: false, status: 0, count: 0 };
    }
  }),
);

for (const r of results) {
  const mark = r.ok ? "✓" : "✗";
  console.log(`${mark} ${r.ats.padEnd(10)} ${r.slug.padEnd(35)} ${r.status} ${r.count} jobs  (${r.name})`);
}

export {};
