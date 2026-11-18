# Recruiter API

All endpoints use the `/api/recruiter` prefix and require a bearer token for an
active account with the `COMPANY` role. Company, job, application, interview,
and notification ownership is derived from the authenticated account.

## Company

| Method | Path | Purpose |
|---|---|---|
| GET | `/catalog` | List active industries, locations, skills, job levels and employment types |
| GET, POST, PATCH | `/profile` | Read, create or update the authenticated recruiter's company profile |
| POST | `/profile/logo` | Upload a JPEG, PNG or WebP logo using multipart field `file` (maximum 5 MB) |
| DELETE | `/profile/logo` | Remove the current company logo |

Company profile updates cannot change `user_id`, verification state or logo
references. Only verified companies can publish jobs.
Logo upload/removal requires the Cloudinary credentials used by the CV API.
The profile response includes the public logo URL when a logo is present.

## Jobs

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/jobs` | List company jobs or create a draft |
| GET, PATCH | `/jobs/:jobId` | Read or update an owned job |
| PUT | `/jobs/:jobId/skills` | Replace required skills |
| POST | `/jobs/:jobId/publish` | Publish an eligible job |
| POST | `/jobs/:jobId/close` | Close an active/draft job |
| GET | `/jobs/:jobId/applications` | List applications for an owned job |

Job updates accept only editable business fields. Status, company ID,
visibility flags and revision are controlled by the server. Salary must either
be negotiable with both salary bounds omitted, or have both non-negative bounds
with the maximum greater than or equal to the minimum. List endpoints accept
`page` and `limit` (`limit` from 1 to 100).

## Applications and interviews

| Method | Path | Purpose |
|---|---|---|
| GET | `/applications` | List applications; supports `status`, `jobId`, `page`, `limit` |
| GET | `/applications/:applicationId` | Read an owned application and submitted candidate information |
| PATCH | `/applications/:applicationId/status` | Change status and/or internal `recruiter_note` |
| GET | `/applications/:applicationId/cv-download` | Get a short-lived private download URL for the submitted CV |
| GET | `/interviews` | List interviews for the company's applications |
| POST | `/applications/:applicationId/interviews` | Schedule an interview |
| PATCH | `/interviews/:interviewId` | Update a scheduled interview |
| PATCH | `/interviews/:interviewId/cancel` | Cancel a scheduled interview |
| PATCH | `/interviews/:interviewId/complete` | Complete an accepted interview after its end time while the application is in INTERVIEW |

Interview lists support `status` (`SCHEDULED`, `COMPLETED`, `CANCELLED`),
`applicationId`, `page` and `limit`. Each interview includes the owned application
and job, plus `application.candidate.full_name` and `email` from the submitted
profile snapshot. The list does not return the full profile snapshot.
Application details include `completed_interview_count` so the frontend can
show eligibility for an offer; the status endpoint rechecks this condition.

Allowed application transitions:

| Current | Next |
|---|---|
| SUBMITTED | REVIEWING, REJECTED |
| REVIEWING | INTERVIEW, REJECTED |
| INTERVIEW | OFFERED, REJECTED |
| OFFERED | HIRED, REJECTED |
| HIRED, REJECTED, WITHDRAWN | No further status transition; internal notes remain editable |

Application status changes follow the server-side transition rules. Status
updates and interview scheduling notify the candidate. Scheduling accepts
`title`, `starts_at`, `ends_at`, and `mode`, with optional `timezone_name`,
`meeting_url`, `location_text`, and `invitation_note`. Times must be ISO 8601
with an explicit timezone; online meetings require an HTTPS URL and offline
meetings require a location.

Creation requires an application in REVIEWING or INTERVIEW and a future start;
creation changes REVIEWING to INTERVIEW. Edits require a SCHEDULED interview,
an application in REVIEWING or INTERVIEW and a resulting future start. Changing
the start, end, mode, meeting URL or location resets the candidate response to
PENDING; changing the title or invitation note preserves it. A SCHEDULED
interview can be cancelled even after its start or after the application has closed.

The status endpoint accepts `{ "status": "REVIEWING" }`,
`{ "status": "REJECTED", "recruiter_note": "..." }`, or a note-only body such
as `{ "recruiter_note": "Liên hệ lại vào tuần tới." }`. Recruiter notes are
internal and are not exposed through candidate endpoints.

CV download is restricted to applications belonging to the authenticated
company and requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET`.

## AI assistance

| Method | Path | Purpose |
|---|---|---|
| POST | `/jobs/:jobId/ai-description` | Generate a JD draft from the owned saved job |
| GET | `/jobs/:jobId/ai-tasks` | Paginated JD task history for the requester and owned job |
| POST | `/applications/:applicationId/interview-questions` | Generate 5–12 interview questions from submitted snapshots |
| GET | `/applications/:applicationId/ai-tasks` | Paginated question task history for the requester and owned application |

Generation accepts `{ "notes": "..." }` (up to 2,000 characters) or `{}`.
Successful POST responses contain `data`, `taskId` and `meta`. JD output is a
draft applied through the existing revision-protected job update workflow.
Groq is the default configured provider. See [AI integration](ai-integration.md)
for configuration, free-tier limits and error codes.

## Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | List the recruiter's notifications and unread count |
| PATCH | `/notifications/:notificationId/read` | Mark one owned notification as read |
| PATCH | `/notifications/read-all` | Mark all notifications as read |

The notification list supports `page`, `limit` and `unread=true` (unread only).
Omitting `unread` or using `unread=false` returns all items; other values return
400. The response includes `unreadCount` for the entire authenticated user's
inbox, independently of the filter/pagination. List/read operations always
scope by the authenticated user's ID. The frontend maps legacy
`/company/profile` and known application links to recruiter pages.

## Current request rules

New COMPANY registrations create an initial PENDING company in the same transaction.
Use PATCH /profile to complete it; POST /profile supports older accounts with no company.
Changing the company name returns verification to PENDING.

PATCH /jobs/:jobId and PUT /jobs/:jobId/skills require the current `revision` in
the JSON body. A stale revision returns 409. Publishing requires an active required
skill and an address for onsite/hybrid work. Failed checks save NEEDS_CHANGES and
return 422 with fields. CLOSED/EXPIRED jobs can be edited and published again.

PATCH /interviews/:interviewId/complete marks an accepted interview complete after
its end time. OFFERED requires a completed interview; HIRED requires OFFERED.
Terminal application transitions cancel future scheduled interviews.
Application details return submitted snapshots, not the candidate's later profile.
