import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CivicLense — independent community reporting" },
      {
        name: "description",
        content:
          "CivicLense is an independent UK community platform for mapping, reporting and tracking problems with public infrastructure and the local environment.",
      },
      { property: "og:title", content: "About CivicLense" },
      {
        property: "og:description",
        content: "An independent community platform for local infrastructure and environment issues.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">About</p>
          <h1 className="mt-2 text-3xl font-semibold">
            See it. Report it. Confirm it. Track it.
          </h1>
        </header>
        <p className="text-muted-foreground">
          CivicLense is an independent community platform for mapping, reporting and tracking
          problems with public infrastructure and the local environment. It launches in Southampton
          and is built to expand across the United Kingdom.
        </p>
        <div className="civic-card space-y-3 p-5">
          <h2 className="text-lg font-semibold">What makes it different</h2>
          <p className="text-sm text-muted-foreground">
            Most reporting tools end the moment a report is submitted. CivicLense keeps a public,
            community-maintained record: any resident can confirm that a problem is{" "}
            <strong className="text-foreground">still a problem</strong>, so issues cannot quietly
            disappear.
          </p>
        </div>
        <div className="civic-card space-y-3 p-5">
          <h2 className="text-lg font-semibold">We are not a council website</h2>
          <p className="text-sm text-muted-foreground">
            CivicLense is not affiliated with, endorsed by, or operated by any local authority. We
            do not publish council responses unless a verified authority provides them. Issue
            statuses reflect community and platform information only.
          </p>
        </div>
        <div className="civic-card space-y-3 p-5">
          <h2 className="text-lg font-semibold">Your privacy</h2>
          <p className="text-sm text-muted-foreground">
            We never publish your surname, email address or full postcode. Residents appear
            publicly as a first name and postcode district, for example{" "}
            <span className="font-medium text-foreground">Kayne · SO15</span>.
          </p>
        </div>
      </article>
    </AppShell>
  );
}
