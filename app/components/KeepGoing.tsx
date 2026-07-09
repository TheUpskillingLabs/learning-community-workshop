import type { KeepGoing as KeepGoingData } from "@/lib/types";

// End-of-day handoff so a table's conversation keeps going: register for The
// Labs, and (if the facilitator set it) accept the Slack invite. The Slack CTA
// hides gracefully until a link is configured.
export function KeepGoing({ keep }: { keep: KeepGoingData }) {
  return (
    <div className="card">
      <div className="eyebrow eyebrow-teal">Keep going</div>
      <h2>Take your table with you</h2>
      <p className="muted">
        Today doesn&apos;t have to end here. Join The Upskilling Labs to keep
        building with people who serve learners like yours
        {keep.keeper ? `, with ${keep.keeper} keeping the group going` : ""}.
      </p>
      <div className="row" style={{ marginTop: 14 }}>
        <a
          className="btn btn-red"
          href={keep.labsUrl}
          target="_blank"
          rel="noreferrer"
        >
          Register for The Labs
        </a>
        {keep.slackUrl && (
          <a className="btn" href={keep.slackUrl} target="_blank" rel="noreferrer">
            Join the Slack
          </a>
        )}
      </div>
      {!keep.slackUrl && (
        <p className="help" style={{ marginTop: 12 }}>
          Your table&apos;s Slack invite appears here once the facilitator adds it.
        </p>
      )}
    </div>
  );
}
