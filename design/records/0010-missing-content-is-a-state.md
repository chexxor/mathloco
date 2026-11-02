# 0010 — Missing content is a state with a design, never a build failure and never a blank

**Recorded 2026-11-01. The operator ruled it; this record exists because the shape of the fix is
expensive to redo.**

The rule: a section whose data is absent or failed renders *designed content* — an empty state, a
retry, or an honest dated line. It does not render nothing, and it does not fail the build. "Make the
build fail so someone notices" was explicitly rejected as inelegant.

What the code actually does today (`src/components/UpcomingMeetups.astro:35-39`):

```js
const feed = await getFeed();
const upcoming = (feed?.items ?? []).filter((item) => new Date(item?.date?.dateTime) > new Date()).slice(0, 4);
---
{upcoming.length ? view('card', { items: upcoming }) : (fallback ?? null)}
```

There is no `{:else}` branch, and `fallback` is a prop whose default comes from `src/consts.ts`. So
an empty feed renders *literally nothing* where a section heading already sits, and the only way to
put copy there is for someone to author a constant in `consts.ts`. That is a content authority
decision smuggled into a build artifact.

Why this is a design-system matter and not a bug fix: the empty state, the failed state and the
cancelled state all use the same vocabulary as everything else — a word in a role colour plus a
keyline (rule 12). If they are invented later, per component, they will invent colours (the shipped
attempt is `text-red-600` on `bg-red-50`, which measures 1.09 against its own fill = flat), and they
will shift layout.

Consequences enforced:
- Every data-driven surface gets its state at the same time as its happy path, in the same commit.
- A missing state fails review, the same as a missing `alt`.
- Height reservation is part of the state, so fixing an empty section costs no layout shift.
- The server is never allowed to be the authority on whether a *human* knows a meetup exists. It
  decides what exists; the design decides what is said when nothing does.
