// Only map known internal destinations. Older notifications use legacy paths.
export function notificationDestination(path, role) {
  if (typeof path !== "string") return null;
  if (role === "CANDIDATE") {
    const application = path.match(/^\/(?:candidate\/)?applications\/([1-9]\d*)\/?$/);
    if (application) return "/candidate/applications/" + application[1];
    const cv = path.match(/^\/(?:candidate\/)?cvs\/([1-9]\d*)(\/matches)?\/?$/);
    if (cv) return "/candidate/cvs/" + cv[1] + (cv[2] || "");
    if (["/candidate/interviews", "/interviews"].includes(path)) return "/candidate/interviews";
  }
  if (role === "COMPANY") {
    if (["/recruiter/profile", "/company/profile"].includes(path)) return "/recruiter/profile";
    const application = path.match(/^\/(?:recruiter\/|company\/)?applications\/([1-9]\d*)\/?$/);
    if (application) return "/recruiter/applications/" + application[1];
    const job = path.match(/^\/(?:recruiter\/|company\/)jobs\/([1-9]\d*)\/?$/);
    if (job) return "/recruiter/jobs/" + job[1];
    if (["/recruiter/interviews", "/company/interviews"].includes(path)) return "/recruiter/interviews";
  }
  return null;
}
