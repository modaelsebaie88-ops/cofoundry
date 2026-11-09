-- =====================================================================
-- Reference data (safe for every environment).
-- Demo users & demo activity are created separately by `npm run seed:demo`.
-- =====================================================================

insert into public.categories (slug, name, description, icon, sort_order) values
  ('ai-ml', 'AI & Machine Learning', 'Founders building with machine learning, LLMs, computer vision and data products.', 'brain-circuit', 1),
  ('saas', 'Software & SaaS', 'B2B and B2C software businesses, developer tools and subscription products.', 'app-window', 2),
  ('fintech', 'FinTech', 'Payments, lending, banking infrastructure, insurance and personal finance.', 'landmark', 3),
  ('edtech', 'EdTech', 'Learning platforms, education infrastructure and workforce upskilling.', 'graduation-cap', 4),
  ('healthtech', 'HealthTech', 'Digital health, medtech, wellbeing and care delivery.', 'heart-pulse', 5),
  ('ecommerce', 'E-commerce & Retail', 'DTC brands, marketplaces, retail tech and commerce enablement.', 'shopping-bag', 6),
  ('marketing', 'Marketing & Advertising', 'Martech, adtech, creator economy and growth tooling.', 'megaphone', 7),
  ('cybersecurity', 'Cybersecurity', 'Security products, identity, privacy and compliance.', 'shield-check', 8),
  ('web3', 'Blockchain & Web3', 'Protocols, wallets, on-chain applications and digital assets.', 'blocks', 9),
  ('climate', 'Sustainability & ClimateTech', 'Decarbonisation, energy, circular economy and climate adaptation.', 'leaf', 10),
  ('gaming', 'Gaming & Entertainment', 'Games, interactive media, streaming and entertainment tech.', 'gamepad-2', 11),
  ('hardware', 'Hardware & Robotics', 'Devices, IoT, robotics, manufacturing and deep tech.', 'cpu', 12),
  ('consulting', 'Business & Consulting', 'Services businesses, agencies, consulting and operations.', 'briefcase', 13),
  ('other', 'Other Industries', 'Everything else — tell the community what you are building.', 'sparkles', 14);

-- Communities are created automatically for each category (trigger); add default guidelines.
update public.communities set rules =
  E'1. Be constructive and specific — share context with your questions.
2. No unsolicited sales pitches or spam.
3. Respect confidentiality: don''t share what others post outside the community.
4. Use the Opportunities marketplace for hiring and co-founder searches.
5. Report anything that breaks these rules — moderators review every report.';

insert into public.skills (name, capability) values
  -- engineering
  ('Full-stack development', 'engineering'), ('Frontend development', 'engineering'), ('Backend development', 'engineering'),
  ('Mobile development', 'engineering'), ('iOS', 'engineering'), ('Android', 'engineering'), ('React', 'engineering'),
  ('Next.js', 'engineering'), ('Node.js', 'engineering'), ('Python', 'engineering'), ('Go', 'engineering'),
  ('Rust', 'engineering'), ('TypeScript', 'engineering'), ('DevOps', 'engineering'), ('Cloud architecture', 'engineering'),
  ('Smart contracts', 'engineering'), ('Embedded systems', 'engineering'), ('Security engineering', 'engineering'),
  ('Game development', 'engineering'), ('QA & testing', 'engineering'),
  -- data & AI
  ('Machine learning', 'data_ai'), ('LLM applications', 'data_ai'), ('Data engineering', 'data_ai'),
  ('Data science', 'data_ai'), ('Computer vision', 'data_ai'), ('NLP', 'data_ai'), ('Analytics', 'data_ai'),
  -- design
  ('Product design', 'design'), ('UX research', 'design'), ('UI design', 'design'), ('Brand design', 'design'),
  ('Design systems', 'design'), ('Motion design', 'design'), ('Industrial design', 'design'),
  -- product
  ('Product management', 'product'), ('Product strategy', 'product'), ('Roadmapping', 'product'), ('User interviews', 'product'),
  -- marketing & content
  ('Growth marketing', 'marketing'), ('SEO', 'marketing'), ('Performance marketing', 'marketing'),
  ('Content marketing', 'content'), ('Copywriting', 'content'), ('Social media', 'marketing'),
  ('Brand strategy', 'marketing'), ('Email marketing', 'marketing'), ('Product marketing', 'marketing'),
  ('Community building', 'community'), ('Developer relations', 'community'),
  -- sales & bd
  ('B2B sales', 'sales'), ('Enterprise sales', 'sales'), ('Sales operations', 'sales'), ('Customer success', 'sales'),
  ('Partnerships', 'business_development'), ('Business development', 'business_development'), ('Go-to-market strategy', 'business_development'),
  -- fundraising & finance
  ('Fundraising', 'fundraising'), ('Pitching', 'fundraising'), ('Financial modeling', 'fundraising'),
  ('Angel investing', 'investment'), ('Venture capital', 'investment'),
  -- ops & legal
  ('Operations', 'operations'), ('Supply chain', 'operations'), ('Hiring & recruiting', 'operations'),
  ('Project management', 'operations'), ('Legal & compliance', 'legal'), ('Contracts', 'legal'), ('IP & patents', 'legal'),
  -- mentorship
  ('Leadership coaching', 'mentorship'), ('Founder coaching', 'mentorship');

insert into public.platform_settings (key, value) values
  ('allow_signups', 'true'),
  ('community_chat_enabled', 'true'),
  ('announcement_banner', '""');

-- ---------------------------------------------------------------------
-- Resource library (original editorial content)
-- ---------------------------------------------------------------------
insert into public.resources (slug, title, summary, category, kind, read_minutes, is_featured, body) values
('validate-your-idea-in-two-weeks', 'Validate your startup idea in two weeks',
 'A practical, interview-driven process to find out whether a problem is worth solving before writing code.',
 'guides', 'guide', 7, true,
E'## Why validate first\nMost early startups fail because they build something nobody urgently needs. Two focused weeks of validation can save months of building.\n\n## Week 1 — Problem interviews\n1. **Write a one-sentence problem hypothesis.** "Independent clinics lose 6+ hours a week reconciling insurance claims."\n2. **List 30 people who live with the problem.** Use LinkedIn, communities on Cofoundry and your own network.\n3. **Run 15–20 minute interviews.** Ask about the last time the problem happened, what they did, and what it cost them. Never pitch.\n4. **Score each interview** on pain (1–5), frequency and current spend.\n\n## Week 2 — Solution signals\n- Build a landing page or clickable prototype describing the outcome, not features.\n- Ask your best interviewees for a commitment: a pilot, a letter of intent, a pre-order or an intro to their boss.\n- Commitments matter more than compliments.\n\n## Decision rule\nContinue if at least 30% of interviewees rate the pain 4+ and at least 3 offer a real commitment. Otherwise, refine the segment or the problem and repeat.'),

('finding-a-cofounder', 'How to find (and vet) a co-founder',
 'Where to look, what to test for, and the uncomfortable conversations to have before you split equity.',
 'guides', 'guide', 8, true,
E'## Start with what the company needs\nList the 3–5 hardest things your startup must get right in the next 18 months. Your co-founder should own at least one you cannot.\n\n## Where to look\n- People you have already worked with (strongest signal).\n- Founder communities and the **Looking for a Co-Founder** opportunities on Cofoundry.\n- Hackathons and build weekends — shipping together is the best interview.\n\n## Vet through work, not coffee\nAgree on a 2–4 week trial project with a concrete deliverable. Watch how you handle disagreement, deadlines and ambiguity.\n\n## Conversations to have early\n- Time commitment and personal runway.\n- Roles, titles and who makes final calls.\n- What happens if one of you leaves (vesting with a 1-year cliff is the norm).\n- Ambition: lifestyle business, venture scale, or somewhere in between?\n\n## Red flags\nAvoiding equity discussions, reluctance to commit time, or values misalignment on how to treat customers and team.'),

('pitch-deck-structure', 'The 12-slide pitch deck structure',
 'A proven slide-by-slide outline for pre-seed and seed decks, with what investors look for on each slide.',
 'pitch_decks', 'template', 6, true,
E'## The outline\n1. **Title** — company name, one-line description, contact.\n2. **Problem** — who has it, how painful, evidence.\n3. **Solution** — the outcome you deliver; a screenshot beats a paragraph.\n4. **Why now** — the shift that makes this possible today.\n5. **Market** — bottom-up sizing: number of customers × what they pay.\n6. **Product** — how it works, the key workflow.\n7. **Traction** — revenue, growth rate, pilots, waitlist, retention. Be precise.\n8. **Business model** — pricing, unit economics if known.\n9. **Competition** — honest landscape and your unfair advantage.\n10. **Go-to-market** — the repeatable channel you will scale.\n11. **Team** — why you are the people to win this.\n12. **The ask** — amount, runway it buys, milestones it unlocks.\n\n## Tips\n- One idea per slide; titles should read like a story on their own.\n- Send a version that works without you presenting it.\n- Keep appendix slides for detailed metrics and questions.'),

('fundraising-pre-seed-playbook', 'Pre-seed fundraising playbook',
 'How to build a target list, run a tight process and close your first round without losing months.',
 'fundraising', 'guide', 9, false,
E'## Before you start\n- Know your milestone: what will this money prove?\n- Decide instrument (SAFE or priced round) and a valuation range.\n- Prepare: deck, a short memo, data room with cap table and key metrics.\n\n## Build the pipeline\nList 60–100 angels and funds who invest at your stage and sector. Prioritise warm intros; ask founders they have backed.\n\n## Run a process\n- Compress first meetings into 2–3 weeks so momentum builds.\n- Track every conversation in a simple CRM: stage, next step, date.\n- Follow up with concise updates — progress creates urgency.\n\n## Closing\nOnce you have a lead or meaningful first commitments, set a close date. Use standard documents to keep legal costs low.\n\n## After the round\nSend monthly investor updates: metrics, wins, challenges, asks. Investors who are informed help more.'),

('investor-update-template', 'Monthly investor update template',
 'A simple, repeatable format that keeps investors informed and makes asking for help easy.',
 'templates', 'template', 3, false,
E'**Subject:** [Company] — [Month] update\n\n**TL;DR** — one or two sentences on the month.\n\n**Key metrics**\n| Metric | This month | Last month | Change |\n|---|---|---|---|\n| Revenue / MRR | | | |\n| Active customers | | | |\n| Burn | | | |\n| Runway (months) | | | |\n\n**Wins**\n- \n\n**Challenges**\n- \n\n**Asks** — specific intros or help you need.\n- \n\n**Thank you** — call out anyone who helped.'),

('first-1000-users', 'Getting your first 1,000 users',
 'Channel ideas that work before you have a brand, budget or growth team.',
 'marketing', 'guide', 7, false,
E'## Do things that don\'t scale\nPersonally onboard early users. Every conversation teaches you about activation and messaging.\n\n## Pick one or two channels\n- **Communities** where your users already gather — contribute value before promoting.\n- **Content** that answers questions your users search for.\n- **Partnerships** with products your users already pay for.\n- **Outbound** for B2B: 50 highly personalised messages beat 5,000 templates.\n\n## Measure the funnel\nVisitors → sign-ups → activated → retained after 4 weeks. Fix the leakiest step first.\n\n## Build loops\nAsk: does each new user bring the next one? Referrals, shared artefacts and invites compound over time.'),

('positioning-worksheet', 'Positioning worksheet',
 'Answer six questions to sharpen how you describe your startup to customers, investors and collaborators.',
 'marketing', 'checklist', 4, false,
E'1. **Competitive alternatives** — what would customers do if you did not exist?\n2. **Unique attributes** — what do you have that the alternatives lack?\n3. **Value** — what does each attribute enable for the customer?\n4. **Best-fit customers** — who cares most about that value?\n5. **Market category** — what frame makes your value obvious?\n6. **One-liner** — "We help [customer] achieve [outcome] by [unique approach], unlike [alternative]."\n\nTest your one-liner in five customer conversations and refine it based on what makes them lean in.'),

('cofounder-agreement-checklist', 'Co-founder agreement checklist',
 'The topics every founding team should put in writing — reviewed with a lawyer in your jurisdiction.',
 'legal_ops', 'checklist', 4, false,
E'- [ ] Equity split and the reasoning behind it\n- [ ] Vesting schedule (commonly 4 years with a 1-year cliff)\n- [ ] Roles, responsibilities and decision rights\n- [ ] Time commitment and outside activities\n- [ ] IP assignment of all work to the company\n- [ ] What happens on departure (good/bad leaver)\n- [ ] Dispute resolution process\n- [ ] Salary and expense policy\n- [ ] Confidentiality\n\n> This checklist is educational and not legal advice. Have a qualified lawyer review your final agreement.'),

('incorporation-basics', 'Incorporation and early legal basics',
 'An overview of the legal foundations to put in place before raising money or hiring.',
 'legal_ops', 'guide', 5, false,
E'## Typical early steps\n- Choose an entity type suited to raising investment in your jurisdiction.\n- Issue founder shares with vesting and file any required tax elections promptly.\n- Assign all IP (code, designs, domains) to the company.\n- Open a business bank account and keep company and personal finances separate.\n- Use written agreements for contractors, including IP assignment.\n\n## Keep a tidy data room\nCorporate documents, cap table, contracts, IP assignments and board consents. Clean records make fundraising and acquisitions faster.\n\n> Educational overview only — consult a lawyer and accountant where you operate.'),

('startup-tool-stack', 'The lean startup tool stack',
 'Tool categories most early teams need, and how to choose without overspending.',
 'tools', 'tool', 4, false,
E'| Need | What to look for |\n|---|---|\n| Docs & wiki | Shared editing, templates, permissions |\n| Project tracking | Lightweight issues, cycles, integrations |\n| Communication | Channels, threads, huddles |\n| Design | Collaborative files, prototyping |\n| Analytics | Event tracking, funnels, retention cohorts |\n| CRM | Simple pipeline, email sync |\n| Finance | Expense cards, bookkeeping integration |\n\n**Rules of thumb:** prefer tools with generous startup programs, avoid annual contracts before product-market fit, and review subscriptions every quarter.'),

('weekly-metrics-dashboard', 'Weekly metrics dashboard template',
 'Track the handful of numbers that actually tell you whether your startup is working.',
 'templates', 'template', 3, false,
E'Track weekly, review every Monday:\n\n- **North-star metric** — the one number that reflects customer value.\n- **Acquisition** — new sign-ups / leads by channel.\n- **Activation** — % who reach the "aha" moment in week one.\n- **Retention** — % active after 4 weeks (by cohort).\n- **Revenue** — new MRR, churned MRR, net MRR.\n- **Burn & runway**.\n\nWrite one sentence per metric explaining what changed and why. Patterns become obvious within a month.'),

('story-from-side-project-to-seed', 'From side project to seed round: a founder story',
 'How a two-person team turned a weekend tool into a funded company — and what they would do differently.',
 'success_stories', 'story', 6, true,
E'*A composite story based on common founder journeys, written for the Cofoundry library.*\n\n## The spark\nTwo former colleagues — one engineer, one operations lead — kept rebuilding the same internal reporting spreadsheet at every job. They built a weekend tool to automate it and shared it in a founder community.\n\n## Early traction\nThirty teams signed up in a month. Instead of adding features, they interviewed every active user and discovered finance teams — not ops — felt the pain most.\n\n## The pivot in focus\nThey rewrote the landing page for finance leaders, priced at a level that required a real buying decision, and closed eight paying pilots.\n\n## Raising\nWith paying customers and 20% month-over-month growth, they ran a three-week pre-seed process and closed a round led by an angel who was also a customer.\n\n## What they would do differently\n- Write a co-founder agreement on day one.\n- Charge earlier — free users gave weaker feedback.\n- Join communities sooner: their first hire and first investor both came from founder introductions.'),

('story-finding-technical-cofounder', 'How a non-technical founder found a CTO',
 'Lessons from a founder who spent six months searching — and what finally worked.',
 'success_stories', 'story', 5, false,
E'*A composite story written for the Cofoundry library.*\n\nA healthcare operator had deep domain expertise but no technical background. Early attempts — pitching engineers at meetups — went nowhere.\n\n**What worked:**\n1. **Proving demand first.** She pre-sold a pilot to two clinics using a no-code prototype.\n2. **Specific asks.** Instead of "looking for a tech co-founder", she posted a concrete opportunity: the problem, the pilots, the stack constraints and the equity range.\n3. **A paid trial project.** She and her eventual CTO built the pilot integration together over four weeks before discussing equity.\n\nThe result: a co-founder who had seen the customer pain first-hand and a working product on day one of the partnership.'),

('customer-discovery-questions', 'Customer discovery question bank',
 '40 open-ended interview questions grouped by goal — problem, workflow, buying process and willingness to pay.',
 'guides', 'checklist', 5, false,
E'### Understand the problem\n- Tell me about the last time you dealt with [problem].\n- What was the hardest part?\n- How often does this happen?\n\n### Current workflow\n- Walk me through how you handle it today.\n- What tools do you use? What do you like and dislike about them?\n\n### Impact\n- What does this cost you in time or money?\n- What happens if it is not solved?\n\n### Buying process\n- Who else is involved in decisions like this?\n- Have you looked for a solution? What stopped you?\n\n### Willingness to pay\n- What do you spend on this today?\n- If this were solved, what would it be worth to you?\n\n**Golden rule:** ask about past behaviour, not hypothetical futures.');
