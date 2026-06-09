# Claude Code prompt: add a confirmation step before closing a sweepstake

A paying organiser appears to have closed their sweepstake unintentionally. Closing is a significant, hard-to-undo action (it stops new players joining), so it should never happen on a single click. Add a clear confirmation step, and make accidental closes recoverable. Use British English. Do not use em dashes.

## 1. Confirmation dialog before closing
- When the organiser taps "Close sweepstake", show a confirmation modal before anything changes. Do not close on the first click.
- The modal should clearly state what closing does and that it can be hard to undo, for example: "Close this sweepstake? No new players will be able to join, and the draw/standings are locked. You can reopen it from your dashboard if you change your mind."
- Require an explicit confirm action (a distinct "Yes, close it" button), with "Cancel" as the easy default. Make the destructive button visually secondary so it is not the path of least resistance.
- Apply the same confirmation to any other destructive or hard-to-reverse organiser action (e.g. deleting a sweepstake, running the draw if that is irreversible).

## 2. Make closing reversible (reopen)
- Add a "Reopen" action on the organiser's dashboard and sweepstake page for sweepstakes in the `closed` state, so an organiser can undo a close themselves without emailing me.
- Reopening should restore the sweepstake to its previous joinable state (open/drawn as appropriate) without losing any existing entries, payments, or standings.
- If reopening is not safe in some states (e.g. after results have been finalised), allow it where safe and explain clearly where it is not.

## 3. Guardrails and clarity
- Keep the "Close" control from being the most prominent button on the page; it should not sit where a primary action (like "Copy share link") is expected.
- After a successful close, show a confirmation toast with a quick "Undo" link that reopens it, so an accidental close is instantly recoverable in the moment.

## 4. Verify
- Test: clicking Close shows the modal; cancelling makes no change; confirming closes it; the toast Undo reopens it; the dashboard Reopen action works and preserves entries/payments/standings.
- Confirm no existing data is lost through a close-then-reopen cycle.
- Report what changed and show the modal and the reopen flow.
```
