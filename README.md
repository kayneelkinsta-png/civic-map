# Civic Map

Build the initial foundation for a production-quality web application called CivicLense.

PRODUCT

CivicLense is an independent UK community platform for mapping, reporting and tracking problems with public infrastructure and the local environment.

Tagline:

See it. Report it. Confirm it. Track it.

The initial launch area is Southampton, UK, but the entire application must be architected from the beginning to support the whole UK and multiple local authorities.

Do NOT build this as a generic template, dashboard or government-style website.

It should feel like a polished, modern consumer technology product.

Think:

Google Maps

Monzo

Strava

modern civic technology

The map is the heart of the product.

FIRST MVP OBJECTIVE

The first version should establish:

A beautiful interactive map.

Southampton as the initial geographic area.

A functioning Supabase backend.

User authentication.

User profiles.

A working issue database.

The ability to create an issue.

The ability to view an issue.

The ability for residents to confirm that an issue is still a problem.

Basic geographic authority routing.

Do not build advanced council integrations yet.

TECHNOLOGY

Use:

React / TypeScript

Tailwind CSS

Supabase

PostgreSQL

PostGIS

MapLibre

Use clean, maintainable components.

Do not hard-code Southampton-specific database structures.

APPLICATION STRUCTURE

Create these primary routes:

/

Map

/issues

/issues/:id

/report

/insights

/profile

/login

/register

/about

/admin

HOMEPAGE

The homepage should be the CivicLense map.

Use a full-screen responsive map.

Centre the initial map on Southampton.

Provide:

Top-left

CivicLense logo.

Top-centre

Location/search box:

Search Southampton or enter a postcode

Top-right

Report an issue

and user account controls.

Map controls

Zoom

Locate me

Map settings/layers

Bottom / floating controls

Issue category filters.

MAP DESIGN

Use MapLibre.

The map should feel premium and uncluttered.

Use OpenStreetMap-compatible base mapping initially.

Create category markers for:

💡 Street lighting

🕳️ Potholes / road defects

🗑️ Bins

🚶 Pavements

🧹 Fly-tipping

🌳 Trees

🚦 Traffic lights

🌊 Flooding / drainage

🚏 Bus stops

⚠️ Other

Use icons rather than relying only on colour.

Cluster markers when zoomed out.

Clicking a marker opens a compact issue card.

ISSUE CARD

Example:

🕳️ Pothole

Large pothole on Portswood Road

Reported 32 days ago

⚠️ 23 residents say this is still a problem

🔴 Unresolved

View issue →

ISSUE DETAIL

Create a polished issue page.

Example:

Large pothole

📍 Portswood Road, Southampton

🔴 UNRESOLVED

Reported

14 August 2026

Last confirmed

15 September 2026

Community confirmations

23 residents

Age

32 days

Show:

photograph

map

description

category

location

report date

last confirmation

confirmation count

status

status history

comments

responsible authority

THE CORE COMMUNITY FEATURE

Create a prominent button:

⚠️ STILL A PROBLEM

An authenticated resident can press this to confirm that the issue still exists.

When clicked:

increment confirmation count

record the user

record timestamp

update last_confirmed_at

prevent duplicate confirmation from the same user within a sensible period

Display:

23 residents have confirmed this is still a problem.

and:

Last confirmed 2 hours ago

This feature is central to CivicMap.

USER REGISTRATION

Visitors can browse the map without registering.

Registration is required to:

report an issue

confirm an issue

comment

follow an issue

Registration fields:

First name

Surname

Email

Postcode

Password

Use Supabase Auth.

Email verification should be enabled/configured where practical.

Do NOT publicly display:

full surname

email

exact postcode

exact residential address

Public users should appear as something like:

Kayne · SO15

USER PROFILE

Create:

/profile

Display:

My CivicMap

Reports

Confirmations

Following

Resolved

Then show:

My reports

Issues I follow

My confirmations

Account settings

REPORT AN ISSUE

Create a very simple reporting experience.

The user clicks:

+ REPORT AN ISSUE

Step 1:

What are you reporting?

Visual cards:

Pothole

Street light

Bin

Pavement

Fly-tipping

Tree

Traffic light

Flooding

Other

Step 2:

Where is it?

Allow:

current location

map pin

postcode/address search

manual map positioning

Step 3:

What's wrong?

Description field.

Step 4:

Add a photo

Allow image upload using Supabase Storage.

Step 5:

Confirmation screen.

Show:

You're about to report

Category

Location

Photo

Description

Then:

Submit report

ISSUE STATUS

Create these statuses:

NEW

ACKNOWLEDGED

IN_PROGRESS

RESOLVED

REOPENED

Do not pretend that an issue has been acknowledged or resolved by a council unless there is actual authority data.

RESOLUTION

Allow an issue eventually to become:

🟢 RESOLVED

Keep its history.

Do not delete resolved issues from the database.

Display:

Reported

Resolved

Resolution time

Community confirmation history

The architecture should allow a resolved issue to be reopened if residents later confirm that the problem has returned.

AUTHORITY ROUTING

Implement the first version of geographic authority routing.

Create an authority model in the database.

For the MVP, Southampton City Council should be the initial authority.

Every issue should store:

latitude

longitude

authority_id

The architecture must support many authorities.

Do NOT hard-code "Southampton City Council" into the issue system.

The intended future logic is:

Location

↓

Administrative boundary

↓

Responsible authority

↓

Issue category

↓

Reporting destination

For now, create the data structures and initial Southampton authority record.

If PostGIS geographic boundary data is available, prepare the system for point-in-polygon authority lookup.

Do not fabricate boundary data.

DATABASE

Use Supabase PostgreSQL.

Create appropriate tables including:

profiles

authorities

wards

postcodes

issue_categories

issues

issue_photos

issue_confirmations

issue_comments

issue_status_history

issue_followers

notifications

moderation_actions

Create appropriate foreign keys.

Use UUIDs for user-facing record identifiers where appropriate.

Add timestamps.

Use PostGIS geographic types for issue locations.

Create spatial indexes.

SECURITY

Use Supabase Row Level Security.

Users should only be able to edit their own profile.

Users should not be able to alter another user's report.

Users should not be able to manipulate confirmation counts directly.

Confirmation counts should be calculated from confirmation records or updated securely.

Photographs must be protected appropriately.

Admin functionality must require admin privileges.

Never expose private user information through public queries.

SAMPLE DATA

Create development/sample issues around Southampton so that the map does not look empty.

Use realistic examples across different categories.

Clearly identify sample/demo data in development.

Do not present fictional data as genuine council reports in production.

INSIGHTS

Create a basic /insights page.

For now show:

Total issues

Open issues

Resolved issues

Most reported categories

Issues by area

Average issue age

Community confirmations

Use real database data.

Do not make unsupported claims about council performance.

ADMIN

Create the initial structure for /admin.

Include:

Reports

Users

Moderation

Authorities

Categories

Data Sources

Admin users should eventually be able to:

moderate reports

merge duplicates

change categories

suspend users

update issue status

manage authorities

Do not build complex council functionality yet.

DESIGN SYSTEM

Create a consistent CivicLense design system.

Typography should be modern and highly readable.

Use subtle rounded cards.

Use clean spacing.

Use restrained colours.

Use icons consistently.

Avoid excessive gradients.

Avoid cheesy "AI startup" styling.

Avoid generic dashboard templates.

The application should feel credible enough that a UK local authority could eventually see it as a serious civic-tech product.

MOBILE

Mobile is extremely important.

A resident may use CivicLense while physically standing next to the problem.

Prioritise:

fast map loading

large tap targets

camera/photo upload

quick reporting

simple navigation

Use a mobile bottom navigation:

Map

Issues

Report

Insights

Profile

IMPORTANT PRODUCT PRINCIPLE

CivicLense is NOT initially a council website.

It is an independent community platform.

Do not imply official council endorsement.

Do not use council branding.

Do not fabricate council responses.

The long-term goal is to allow verified authorities to integrate with CivicLense, but the community platform must work independently.

BUILD QUALITY

Do not create placeholder buttons that appear functional but do nothing.

The core features should actually connect to Supabase.

Prioritise working functionality over adding lots of extra pages.

Build the foundation cleanly so that future phases can expand CivicLense from Southampton to the entire UK.

Start by creating the application shell, design system, Supabase schema, authentication and interactive Southampton map.

Then implement the core issue/report/confirmation workflow.

## Independent development

CivicLense is a TanStack Start application backed by Supabase. It is independently deployable and has no Lovable runtime or build dependency.

### Requirements

- Bun
- A Supabase project with the migrations in `supabase/migrations` applied

### Environment

Copy `.env.example` to `.env.local` and supply the required Supabase values. Never commit service-role credentials.

### Local development

```sh
bun install
bun run dev
```

### Production build

```sh
bun run build
bun run start
```

### Hosting

The repository includes explicit Vercel framework configuration. Import the GitHub repository into Vercel and configure the environment variables listed in `.env.example`. Pushes to the production branch deploy automatically; pull requests receive preview deployments.
