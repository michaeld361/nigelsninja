import type { RawJob, SourceId } from "@/lib/types";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function job(partial: RawJob): RawJob {
  return { demo: true, currency: "GBP", ...partial };
}

export function fixtureJobs(source: SourceId): RawJob[] {
  const all: RawJob[] = [
    job({
      source: "linkedin",
      externalId: "sample-monzo-dpm",
      title: "Data Protection Manager",
      company: "Monzo",
      location: "London, hybrid, 3 days in the office",
      workPattern: "hybrid",
      hybridDays: 3,
      contractType: "permanent",
      salaryMin: 70000,
      salaryMax: 85000,
      salaryPeriod: "year",
      postedAt: hoursAgo(6),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-monzo-data-protection-manager",
      description: `Monzo is hiring a Data Protection Manager to run privacy operations for a UK digital bank. Hybrid, 3 days in the London office.

You will own DPIAs, records of processing, vendor due diligence and DSARs, and advise product and technology teams on UK and EU GDPR. International transfers, including SCCs, come up often. The role partners with legal, security and procurement. OneTrust experience is useful. AI governance questions are increasing as new tools are proposed.

This is a permanent role. Salary £70,000 to £85,000. Start date as soon as you are available.`,
    }),
    job({
      source: "reed",
      externalId: "sample-monzo-dpm-reed",
      title: "Data Protection Manager",
      company: "Monzo",
      location: "London, hybrid",
      workPattern: "hybrid",
      hybridDays: 3,
      contractType: "permanent",
      salaryMin: 70000,
      salaryMax: 85000,
      salaryPeriod: "year",
      postedAt: hoursAgo(5),
      listingUrl: "https://www.reed.co.uk/jobs/sample-monzo-data-protection-manager",
      publisher: "Reed.co.uk",
      description: `The same Data Protection Manager role at Monzo, posted on Reed.co.uk. London hybrid, 3 days in the office. Permanent. £70,000 to £85,000.

Own DPIAs, the record of processing, vendor due diligence and data subject requests for a UK bank. GDPR, SCCs and advice to product teams. OneTrust is the privacy platform.`,
    }),
    job({
      source: "linkedin",
      externalId: "sample-nhs-hodp",
      title: "Head of Data Protection",
      company: "NHS England",
      location: "London, hybrid",
      workPattern: "hybrid",
      hybridDays: 2,
      contractType: "permanent",
      salaryMin: 65000,
      salaryMax: 78000,
      salaryPeriod: "year",
      postedAt: hoursAgo(8),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-nhs-england-head-of-data-protection",
      description: `NHS England is recruiting a Head of Data Protection. London hybrid, 2 days in the office. Permanent. Salary £65,000 to £78,000.

You will lead the data protection programme: DPIAs, records of processing, training, incident handling and DSARs across health and care communications. UK GDPR and the Data Protection Act are the daily framework. You will work with information governance colleagues and the Caldicott function. This is a public sector role. Start date as soon as possible.`,
    }),
    job({
      source: "linkedin",
      externalId: "sample-unilever-pol",
      title: "Privacy Operations Lead",
      company: "Unilever",
      location: "London, hybrid",
      workPattern: "hybrid",
      hybridDays: 3,
      contractType: "permanent",
      salaryMin: 75000,
      salaryMax: 90000,
      salaryPeriod: "year",
      postedAt: hoursAgo(10),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-unilever-privacy-operations-lead",
      description: `Unilever is hiring a Privacy Operations Lead in London, hybrid, 3 days on site. Permanent. £75,000 to £90,000.

The role runs privacy operations for global brands in home care, personal care and food: DPIAs, records of processing, vendor due diligence, SCCs and IDTAs, and training for marketing teams. Advertising and data driven personalisation are part of the context. Microsoft Purview and OneTrust are both in use. You will report metrics to the privacy leadership team.`,
    }),
    job({
      source: "linkedin",
      externalId: "sample-linklaters-hodp",
      title: "Head of Data Protection",
      company: "Linklaters",
      location: "London, on-site",
      workPattern: "on-site",
      contractType: "permanent",
      salaryMin: 90000,
      salaryMax: 120000,
      salaryPeriod: "year",
      postedAt: hoursAgo(4),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-linklaters-head-of-data-protection",
      description: `Linklaters is recruiting a Head of Data Protection in London, on site. Permanent.

Requirements: you must be a qualified solicitor with a current practising certificate. The role advises partners and business services on UK GDPR, runs the data protection programme, and manages DSARs with the regulatory team. A qualified UK solicitor is essential. Equivalent experience without admission will not be considered.`,
    }),
    job({
      source: "linkedin",
      externalId: "sample-barclays-analyst",
      title: "Data Protection Analyst",
      company: "Barclays",
      location: "London",
      workPattern: "hybrid",
      contractType: "permanent",
      postedAt: hoursAgo(3),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-barclays-data-protection-analyst",
      description: "Junior Data Protection Analyst supporting DPIAs in London. This title is below the search seniority.",
    }),
    job({
      source: "linkedin",
      externalId: "sample-asda-leeds",
      title: "Head of Privacy",
      company: "Asda",
      location: "Leeds, on-site",
      workPattern: "on-site",
      contractType: "permanent",
      postedAt: hoursAgo(7),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-asda-head-of-privacy-leeds",
      description: "Head of Privacy based on site in Leeds five days a week. Retail privacy programme, DPIAs and vendor due diligence. No remote option.",
    }),
    job({
      source: "jsearch",
      externalId: "sample-puregym-repeat",
      title: "Group Data Compliance Manager",
      company: "PureGym",
      location: "London, hybrid",
      workPattern: "hybrid",
      contractType: "permanent",
      postedAt: hoursAgo(2),
      listingUrl: "https://www.indeed.co.uk/viewjob?jk=sample-puregym",
      publisher: "Indeed",
      description: "Group Data Compliance Manager at PureGym. London hybrid. This matches a role Nigel has already applied for.",
    }),
    job({
      source: "reed",
      externalId: "sample-bhf-ig",
      title: "Information Governance Manager",
      company: "British Heart Foundation",
      location: "United Kingdom, remote",
      workPattern: "remote",
      contractType: "permanent",
      salaryMin: 52000,
      salaryMax: 60000,
      salaryPeriod: "year",
      postedAt: hoursAgo(9),
      listingUrl: "https://www.reed.co.uk/jobs/sample-british-heart-foundation-ig",
      description: `British Heart Foundation is hiring an Information Governance Manager. UK remote. Permanent. £52,000 to £60,000.

You will lead information governance for a health charity: UK GDPR, records of processing, DPIAs, training, data subject requests and supplier due diligence. The team is small. You will be the practical contact for fundraising, retail and care services. Start date as soon as possible.`,
    }),
    job({
      source: "reed",
      externalId: "sample-john-lewis",
      title: "Privacy Programme Manager",
      company: "John Lewis Partnership",
      location: "London, hybrid",
      workPattern: "hybrid",
      hybridDays: 2,
      contractType: "permanent",
      salaryMin: 68000,
      salaryMax: 78000,
      salaryPeriod: "year",
      postedAt: hoursAgo(12),
      listingUrl: "https://www.reed.co.uk/jobs/sample-john-lewis-privacy-programme-manager",
      description: `John Lewis Partnership is hiring a Privacy Programme Manager in London, hybrid, 2 days in the office. Permanent. £68,000 to £78,000.

You will run the privacy programme for a trusted retail brand: DPIAs for customer programmes, vendor due diligence, records of processing, training and privacy metrics for leadership. UK GDPR. Experience with a privacy management platform such as OneTrust is welcome.`,
    }),
    job({
      source: "reed",
      externalId: "sample-hays-contract",
      title: "Data Protection Manager",
      company: "Hays",
      location: "United Kingdom, remote",
      workPattern: "remote",
      contractType: "contract",
      salaryMin: 600,
      salaryMax: 600,
      salaryPeriod: "day",
      postedAt: hoursAgo(11),
      listingUrl: "https://www.reed.co.uk/jobs/sample-hays-data-protection-manager",
      description: `Hays is recruiting a contract Data Protection Manager, inside IR35, UK remote. £600 a day. Three month initial term.

The client needs an operator for DPIAs, RoPAs, DSARs and vendor due diligence while a permanent hire is made. UK GDPR. Available to start immediately.`,
    }),
    job({
      source: "reed",
      externalId: "sample-coordinator",
      title: "Privacy Coordinator",
      company: "Tesco",
      location: "London",
      workPattern: "hybrid",
      contractType: "permanent",
      postedAt: hoursAgo(6),
      listingUrl: "https://www.reed.co.uk/jobs/sample-tesco-privacy-coordinator",
      description: "Privacy Coordinator supporting the data protection team in London. Junior coordination role.",
    }),
    job({
      source: "jsearch",
      externalId: "sample-revolut",
      title: "Senior Data Protection Specialist",
      company: "Revolut",
      location: "London, hybrid",
      workPattern: "hybrid",
      hybridDays: 3,
      contractType: "permanent",
      salaryMin: 80000,
      salaryMax: 95000,
      salaryPeriod: "year",
      postedAt: hoursAgo(5),
      listingUrl: "https://www.indeed.co.uk/viewjob?jk=sample-revolut",
      publisher: "Indeed",
      description: `Revolut is hiring a Senior Data Protection Specialist. London hybrid, 3 days in the office. Permanent. £80,000 to £95,000.

You will handle DPIAs, records of processing, international transfers and product advice for a financial services app. UK and EU GDPR. Vendor due diligence and DSARs sit in the team. A legal qualification is desirable but not essential. OneTrust is in place.`,
    }),
    job({
      source: "jsearch",
      externalId: "sample-wise-ai",
      title: "AI Governance Lead",
      company: "Wise",
      location: "London, hybrid",
      workPattern: "hybrid",
      contractType: "permanent",
      salaryMin: 85000,
      salaryMax: 100000,
      salaryPeriod: "year",
      postedAt: hoursAgo(14),
      listingUrl: "https://www.indeed.co.uk/viewjob?jk=sample-wise",
      publisher: "Indeed",
      description: `Wise is hiring an AI Governance Lead in London, hybrid. Permanent. £85,000 to £100,000.

You will set the governance for new AI tools: assessments before launch, records of processing, vendor reviews and practical guidance for product teams. UK GDPR and the privacy team are close partners. This is a financial services environment.`,
    }),
    job({
      source: "jsearch",
      externalId: "sample-bmw",
      title: "Data Privacy Manager",
      company: "BMW Group UK",
      location: "Farnborough, hybrid",
      workPattern: "hybrid",
      hybridDays: 3,
      contractType: "permanent",
      salaryMin: 70000,
      salaryMax: 82000,
      salaryPeriod: "year",
      postedAt: hoursAgo(16),
      listingUrl: "https://www.indeed.co.uk/viewjob?jk=sample-bmw",
      publisher: "Glassdoor",
      description: `BMW Group UK is hiring a Data Privacy Manager in Farnborough, hybrid, 3 days on site. Permanent. £70,000 to £82,000.

The role covers UK GDPR for customer and marketing data, DPIAs, vendor due diligence and training for the national sales company. Automotive customer communications and personalisation are part of the brief.`,
    }),
    job({
      source: "jsearch",
      externalId: "sample-booking",
      title: "Privacy Senior Manager",
      company: "Booking.com",
      location: "Amsterdam, Europe remote",
      workPattern: "remote",
      contractType: "permanent",
      salaryMin: 90000,
      salaryMax: 110000,
      salaryPeriod: "year",
      currency: "EUR",
      postedAt: hoursAgo(18),
      listingUrl: "https://www.indeed.co.uk/viewjob?jk=sample-booking",
      publisher: "Indeed",
      description: `Booking.com is hiring a Privacy Senior Manager. Europe remote, based in the Netherlands, not a UK contract. Permanent.

You will lead privacy operations for a travel marketplace: DPIAs, records of processing, vendor due diligence and GDPR guidance to product teams. EU GDPR.`,
    }),
    job({
      source: "linkedin",
      externalId: "sample-dfe",
      title: "Data Protection Manager",
      company: "Department for Education",
      location: "London, hybrid",
      workPattern: "hybrid",
      hybridDays: 2,
      contractType: "permanent",
      salaryMin: 58000,
      salaryMax: 67000,
      salaryPeriod: "year",
      postedAt: hoursAgo(20),
      listingUrl: "https://www.linkedin.com/jobs/view/sample-dfe-data-protection-manager",
      description: `The Department for Education is recruiting a Data Protection Manager in London, hybrid, 2 days in the office. Permanent. £58,000 to £67,000.

You will manage DPIAs, records of processing, training and data subject requests for a central government department. UK GDPR. You will work with policy, digital and legal colleagues. Ability to obtain security clearance is desirable. Start date as soon as possible.`,
    }),
    job({
      source: "jsearch",
      externalId: "sample-royal-mail",
      title: "Data Governance Lead",
      company: "Royal Mail",
      location: "London, hybrid",
      workPattern: "hybrid",
      contractType: "permanent",
      salaryMin: 64000,
      salaryMax: 74000,
      salaryPeriod: "year",
      postedAt: hoursAgo(72),
      listingUrl: "https://www.indeed.co.uk/viewjob?jk=sample-royal-mail",
      publisher: "Indeed",
      description: `Royal Mail is hiring a Data Governance Lead in London, hybrid. Permanent. £64,000 to £74,000.

The role connects data stewardship, master data and privacy: records of processing, DPIAs where processing changes, and practical governance for operational data. UK GDPR. A privacy management platform is already in place.`,
    }),
  ];
  return all.filter((item) => item.source === source);
}
