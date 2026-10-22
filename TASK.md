# Show reporter-friendly status labels instead of the admin board's column names

Reports use three statuses (`todo`, `in_progress`, `done`), and everyone sees them under the kanban column names "To do", "In progress" and "Done". Those are internal workflow terms for admins. To the person who sent the report, "To do" reads like a task for them, and "Done" says nothing about what happened to their bug or idea.

Keep the column names on the admin board, and show reporter-facing wording everywhere a normal user sees a report's status.

## Suggested wording

| Status | Admin (board) | Reporter |
| --- | --- | --- |
| `todo` | To do | Received |
| `in_progress` | In progress | Being worked on |
| `done` | Done | Resolved |

The "Resolved" wording could depend on the report type: "Fixed" for bugs, "Added" for ideas, and "Resolved" for other.

## Where it applies

- **My reports page** (`/reports` for non-admins): the status pill on each report.
- **Status-change notifications:** these are written as plain text on the server when the status changes (`ReportsService.update`, using `statusLabels`). They currently read "Admin moved your report #0047 to Done". They should use the reporter wording, for example "Your report #0047 is being worked on" or "Your report #0047 was fixed".
- **Seed:** the seeded report notifications (`createNotifications` in `prisma/seed.ts`) should use the same wording.
- **Feedback confirmation and the My reports intro text:** check that their wording matches.

## Out of scope

- The admin kanban board, its column titles, and the status values in the database and API stay the same.
- Notifications already in the database keep their current text. There are no real users yet, so no backfill is needed.

## Acceptance criteria

- Admins still see "To do", "In progress" and "Done" on the board.
- Non-admins never see those three labels for their own reports, on the My reports page or in notifications.
- New status-change notifications use the reporter wording, and the seed matches.
- One shared mapping defines the labels on each side (server and web), so the wording can't drift between the list and the notifications.
