# Candidate API

All Candidate endpoints use the `/api/candidate` prefix and require:

```http
Authorization: Bearer <JWT>
```

The JWT must belong to an active account with the `CANDIDATE` role. IDs in
request bodies never select the candidate account; ownership is derived from
the authenticated user.

## Profile and candidate data

| Method | Path | Purpose |
|---|---|---|
| GET | `/catalog` | List active skills, locations, industries, job levels and employment types |
| GET, POST, PATCH | `/profile` | Read, create or update the authenticated candidate's profile |
| GET, POST | `/educations` | List or add education |
| PATCH, DELETE | `/educations/:id` | Update or delete owned education |
| GET, POST | `/experiences` | List or add work experience |
| PATCH, DELETE | `/experiences/:id` | Update or delete owned experience |
| GET, POST | `/projects` | List or add projects |
| PATCH, DELETE | `/projects/:id` | Update or delete owned projects |
| GET, POST | `/certifications` | List or add certifications |
| PATCH, DELETE | `/certifications/:id` | Update or delete owned certifications |
| GET, PUT | `/skills` | Read or replace the candidate's skill list |

Existing accounts without a row in `candidate_profiles` can create it with
`POST /profile` and a JSON body containing `full_name`; new Candidate
registrations create an initial profile automatically.

`GET /profile` also returns the names of `location`, `desiredLocation`,
`desiredIndustry` and `desiredEmploymentType` when the corresponding references exist.

Collection list endpoints accept `page` and `limit` query parameters
(`limit` from 1 to 100). `PUT /skills` accepts
`{ "skills": [{ "skillId": 1, "proficiency": "ADVANCED", "evidence": "..." }] }`.

## Jobs and applications

| Method | Path | Purpose |
|---|---|---|
| GET | `/jobs` | Search published, visible and unexpired jobs |
| GET | `/jobs/:jobId` | Read a published job |
| GET | `/saved-jobs` | List saved jobs |
| PUT, DELETE | `/saved-jobs/:jobId` | Save or unsave a job |
| POST | `/jobs/:jobId/applications` | Apply with `{ "cvId": 1, "coverLetter": "..." }` |
| GET | `/applications` | List the candidate's applications |
| GET | `/applications/:applicationId` | Read an owned application and its interviews |
| PATCH | `/applications/:applicationId/withdraw` | Withdraw an application in `SUBMITTED` or `REVIEWING` status |

Job search supports `q`, `industryId`, `locationId`, `levelId`,
`employmentTypeId`, `workMode`, `page` and `limit`.

Job list and detail responses include `is_saved` for the authenticated candidate.
Job details also include `application_id` and `application_status`, or `null` when
the candidate has not applied. Withdrawn applications still occupy the single
application allowed for that candidate and job.
Saved-job entries include the job's location and the flags `is_saved` and
`is_available`. Availability requires a published, visible and unexpired job,
a verified company and an active company account. Unavailable jobs remain in
the saved list and can still be unsaved.

## CVs, interviews and notifications

| Method | Path | Purpose |
|---|---|---|
| POST | `/cvs` | Upload a PDF as multipart field `file` (maximum 10 MB); optional `name` |
| GET | `/cvs` | List active CVs |
| GET | `/cvs/:cvId` | Read an owned CV and extracted text |
| GET | `/cvs/:cvId/download` | Get a short-lived private download URL |
| PATCH | `/cvs/:cvId/archive` | Archive an owned CV |
| POST | `/cvs/:cvId/parse` | Extract searchable text from the PDF; this is not AI parsing |
| GET | `/cvs/:cvId/ai-tasks` | List tasks associated with an owned CV |
| POST, GET | `/cvs/:cvId/matches` | Create or list weighted skill-overlap recommendations |
| GET | `/ai-tasks/:taskId` | Read the authenticated user's task status |
| GET | `/interviews` | List interviews for the candidate's applications |
| PATCH | `/interviews/:interviewId/response` | Respond with `{ "response": "ACCEPTED" }` or `DECLINED` |
| GET | `/notifications` | List notifications and unread count |
| PATCH | `/notifications/:notificationId/read` | Mark one owned notification as read |
| PATCH | `/notifications/read-all` | Mark all owned notifications as read |

Interview lists support `status` (`SCHEDULED`, `COMPLETED`, `CANCELLED`),
`applicationId`, `page` and `limit`. Responses include the application status,
job title and `application.job.company` (ID and name). Ownership remains scoped
to the authenticated candidate even when filtering by application ID.
A candidate may respond only once while an interview is SCHEDULED, its response
is PENDING, its start is in the future and the application is in INTERVIEW.
Changes to times, mode, meeting URL or location reset the response to PENDING;
changes to the title or invitation note preserve it.

CV upload/download requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET`. Without them the CV endpoints return
`CLOUDINARY_NOT_CONFIGURED`. PDF parsing extracts text only. Recommendations
use skill names and aliases found in extracted CV text and are explicitly labeled
`skill-overlap-v1`; they are not generated by an AI provider.

Application, CV, interview, notification and task queries are scoped to the
authenticated candidate. Candidate endpoints do not expose recruiter notes or
allow candidates to change application status except withdrawing an eligible
application.

New application snapshots include skill names and catalog names alongside the
stored reference IDs. Older snapshots remain readable with the data originally
stored. Archiving a CV prevents selecting it for new applications. Previously
submitted applications retain their CV snapshots and recruiter download access.

## Frontend integration details (stage 7)

The AI integration adds `POST /cvs/:cvId/analyze` for structured
profiles and `POST /cvs/:cvId/ai-matches` with `{ "jobId": 1 }` for AI-assisted
skill evidence. Task lists accept `feature=PARSE_CV` or `feature=MATCH_CV`.
Both features require an active READY CV and a configured backend API key.
The existing PDF extraction and rule-based matching routes remain available.
The configured provider defaults to Groq Free. See [AI integration](ai-integration.md)
for setup, responses, quotas and UI flows.

`POST /cvs/:cvId/parse` executes synchronously. It accepts active CVs in
UPLOADED, READY or FAILED status, marks them PROCESSING and returns
`data: { cvId, processingStatus, extractionVersion, text }` on success.
Extraction supports PDFs with a text layer, up to 100 pages; it does not OCR
scanned images. Success sets READY and increments `extraction_version`.
Failures after processing begins set FAILED. Reading the CV returns
`data` (including processing status/version/error), `rawText` and `parsedData`.
The parse endpoint currently does not create an `Ai_task`; the frontend must
not wait for a task ID or retry the POST automatically.

`POST /cvs/:cvId/matches` accepts `{ "jobIds": [1, 2] }` with 1–20 IDs or `{}`
for up to the 20 most recently published eligible jobs. It requires an active,
READY CV with nonempty extracted text. The response is an array of saved
results; each uses a separate transaction and creates a SUCCEEDED MATCH_CV task.
A later failure may leave earlier results saved, so refresh history before
resubmitting. An empty eligible set returns an empty result array.

`GET /cvs/:cvId/matches` supports `page`/`limit`, including for an archived owned
CV. It returns latest results first, with matched/missing skills, evidence,
suggestions, explanation, nullable scores, `job_revision`,
`cv_extraction_version`, current job title/revision/status and task ID/status.
Scores are DECIMAL values and may serialize as strings. A null score means
insufficient basis; it is distinct from a score of zero. CV and job versions
allow the frontend to flag historical results after data changes.

`GET /notifications` supports `unread=true` to return only unread items. Omit
the parameter or use `unread=false` to return all items. Other values return
400. `unreadCount` always counts all unread notifications of the authenticated
candidate, independently of pagination or the filter. Read operations remain
scoped to that candidate. Notification destinations may use legacy internal
paths; the frontend maps known paths to the corresponding candidate routes.
