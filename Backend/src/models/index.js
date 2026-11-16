const { sequelize } = require("../configs/database");

const { User } = require("./auth/User");
const { Password_reset_token } = require("./auth/Password_reset_token");
const { Location } = require("./common/Location");
const { Industry } = require("./common/Industry");
const { Skill } = require("./common/Skill");
const { Skill_alias } = require("./common/Skill_alias");
const { Job_level } = require("./common/Job_level");
const { Employment_type } = require("./common/Employment_type");
const { Media_asset } = require("./common/Media_asset");
const { Interview } = require("./common/Interview");
const { Notification } = require("./common/Notification");
const { Candidate_profile } = require("./candidates/Candidate_profile");
const { Candidate_education } = require("./candidates/Candidate_education");
const { Candidate_experience } = require("./candidates/Candidate_experience");
const { Candidate_project } = require("./candidates/Candidate_project");
const {
  Candidate_certification,
} = require("./candidates/Candidate_certification");
const { Candidate_skill } = require("./candidates/Candidate_skill");
const { Cv_document } = require("./candidates/Cv_document");
const { Saved_job } = require("./candidates/Saved_job");
const { Application } = require("./candidates/Application");
const { Company } = require("./recruitments/Company");
const { Job_post } = require("./recruitments/Job_post");
const { Job_skill } = require("./recruitments/Job_skill");
const { Ai_task } = require("./ai/Ai_task");
const { Match_result } = require("./ai/Match_result");

const noSchemaChanges = { constraints: false };


User.hasMany(Password_reset_token, {
  as: "passwordResetTokens",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
Password_reset_token.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
User.hasOne(Candidate_profile, {
  as: "candidateProfile",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
Candidate_profile.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
User.hasOne(Company, {
  as: "company",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
Company.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
User.hasMany(Media_asset, {
  as: "mediaAssets",
  foreignKey: "owner_user_id",
  ...noSchemaChanges,
});
Media_asset.belongsTo(User, {
  as: "owner",
  foreignKey: "owner_user_id",
  ...noSchemaChanges,
});
User.hasMany(Notification, {
  as: "notifications",
  foreignKey: "user_id",
  ...noSchemaChanges,
});
Notification.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  ...noSchemaChanges,
});

for (const [Model, foreignKey, alias] of [
  [Location, "location_id", "location"],
  [Location, "desired_location_id", "desiredLocation"],
  [Industry, "desired_industry_id", "desiredIndustry"],
  [Employment_type, "desired_employment_type_id", "desiredEmploymentType"],
  [Media_asset, "avatar_asset_id", "avatar"],
]) {
  Candidate_profile.belongsTo(Model, {
    as: alias,
    foreignKey,
    ...noSchemaChanges,
  });
}

for (const [Model, alias] of [
  [Candidate_education, "educations"],
  [Candidate_experience, "experiences"],
  [Candidate_project, "projects"],
  [Candidate_certification, "certifications"],
  [Candidate_skill, "candidateSkills"],
  [Cv_document, "cvDocuments"],
]) {
  Candidate_profile.hasMany(Model, {
    as: alias,
    foreignKey: "candidate_id",
    sourceKey: "user_id",
    ...noSchemaChanges,
  });
  Model.belongsTo(Candidate_profile, {
    as: "candidate",
    foreignKey: "candidate_id",
    targetKey: "user_id",
    ...noSchemaChanges,
  });
}

Skill.hasMany(Skill_alias, {
  as: "aliases",
  foreignKey: "skill_id",
  ...noSchemaChanges,
});
Skill_alias.belongsTo(Skill, {
  as: "skill",
  foreignKey: "skill_id",
  ...noSchemaChanges,
});
Skill.hasMany(Candidate_skill, {
  as: "candidateSkills",
  foreignKey: "skill_id",
  ...noSchemaChanges,
});
Candidate_skill.belongsTo(Skill, {
  as: "skill",
  foreignKey: "skill_id",
  ...noSchemaChanges,
});

Company.hasMany(Job_post, {
  as: "jobs",
  foreignKey: "company_id",
  ...noSchemaChanges,
});
Job_post.belongsTo(Company, {
  as: "company",
  foreignKey: "company_id",
  ...noSchemaChanges,
});
for (const [Model, foreignKey, alias] of [
  [Industry, "industry_id", "industry"],
  [Location, "location_id", "location"],
  [Job_level, "level_id", "level"],
  [Employment_type, "employment_type_id", "employmentType"],
]) {
  Job_post.belongsTo(Model, { as: alias, foreignKey, ...noSchemaChanges });
  Model.hasMany(Job_post, { as: "jobPosts", foreignKey, ...noSchemaChanges });
}
for (const [Model, foreignKey, alias] of [
  [Industry, "industry_id", "industry"],
  [Location, "location_id", "location"],
  [Media_asset, "logo_asset_id", "logo"],
]) {
  Company.belongsTo(Model, { as: alias, foreignKey, ...noSchemaChanges });
}

Cv_document.belongsTo(Media_asset, {
  as: "fileAsset",
  foreignKey: "file_asset_id",
  ...noSchemaChanges,
});
Job_post.hasMany(Job_skill, {
  as: "jobSkills",
  foreignKey: "job_id",
  ...noSchemaChanges,
});
Job_skill.belongsTo(Job_post, {
  as: "job",
  foreignKey: "job_id",
  ...noSchemaChanges,
});
Skill.hasMany(Job_skill, {
  as: "jobSkills",
  foreignKey: "skill_id",
  ...noSchemaChanges,
});
Job_skill.belongsTo(Skill, {
  as: "skill",
  foreignKey: "skill_id",
  ...noSchemaChanges,
});
Job_post.belongsToMany(Skill, {
  as: "skills",
  through: Job_skill,
  foreignKey: "job_id",
  otherKey: "skill_id",
  ...noSchemaChanges,
});
Skill.belongsToMany(Job_post, {
  as: "jobPosts",
  through: Job_skill,
  foreignKey: "skill_id",
  otherKey: "job_id",
  ...noSchemaChanges,
});

Candidate_profile.belongsToMany(Job_post, {
  as: "savedJobs",
  through: Saved_job,
  foreignKey: "candidate_id",
  otherKey: "job_id",
  ...noSchemaChanges,
});
Job_post.belongsToMany(Candidate_profile, {
  as: "savedByCandidates",
  through: Saved_job,
  foreignKey: "job_id",
  otherKey: "candidate_id",
  ...noSchemaChanges,
});
Saved_job.belongsTo(Candidate_profile, {
  as: "candidate",
  foreignKey: "candidate_id",
  targetKey: "user_id",
  ...noSchemaChanges,
});
Saved_job.belongsTo(Job_post, {
  as: "job",
  foreignKey: "job_id",
  ...noSchemaChanges,
});

Job_post.hasMany(Application, {
  as: "applications",
  foreignKey: "job_id",
  ...noSchemaChanges,
});
Application.belongsTo(Job_post, {
  as: "job",
  foreignKey: "job_id",
  ...noSchemaChanges,
});
Candidate_profile.hasMany(Application, {
  as: "applications",
  foreignKey: "candidate_id",
  sourceKey: "user_id",
  ...noSchemaChanges,
});
Application.belongsTo(Candidate_profile, {
  as: "candidate",
  foreignKey: "candidate_id",
  targetKey: "user_id",
  ...noSchemaChanges,
});
Cv_document.hasMany(Application, {
  as: "applications",
  foreignKey: "cv_id",
  ...noSchemaChanges,
});
Application.belongsTo(Cv_document, {
  as: "cv",
  foreignKey: "cv_id",
  ...noSchemaChanges,
});
Application.hasMany(Interview, {
  as: "interviews",
  foreignKey: "application_id",
  ...noSchemaChanges,
});
Interview.belongsTo(Application, {
  as: "application",
  foreignKey: "application_id",
  ...noSchemaChanges,
});

User.hasMany(Ai_task, {
  as: "aiTasks",
  foreignKey: "requested_by",
  ...noSchemaChanges,
});
Ai_task.belongsTo(User, {
  as: "requester",
  foreignKey: "requested_by",
  ...noSchemaChanges,
});
Ai_task.belongsTo(Cv_document, {
  as: "cv",
  foreignKey: "cv_id",
  ...noSchemaChanges,
});
Ai_task.belongsTo(Job_post, {
  as: "job",
  foreignKey: "job_id",
  ...noSchemaChanges,
});
Ai_task.belongsTo(Application, {
  as: "application",
  foreignKey: "application_id",
  ...noSchemaChanges,
});
Ai_task.hasOne(Match_result, {
  as: "matchResult",
  foreignKey: "task_id",
  ...noSchemaChanges,
});
Match_result.belongsTo(Ai_task, {
  as: "task",
  foreignKey: "task_id",
  ...noSchemaChanges,
});
Match_result.belongsTo(Job_post, {
  as: "job",
  foreignKey: "job_id",
  ...noSchemaChanges,
});
Match_result.belongsTo(Cv_document, {
  as: "cv",
  foreignKey: "cv_id",
  ...noSchemaChanges,
});
Match_result.belongsTo(Application, {
  as: "application",
  foreignKey: "application_id",
  ...noSchemaChanges,
});

module.exports = {
  sequelize,
  User,
  Password_reset_token,
  Location,
  Industry,
  Skill,
  Skill_alias,
  Job_level,
  Employment_type,
  Media_asset,
  Interview,
  Notification,
  Candidate_profile,
  Candidate_education,
  Candidate_experience,
  Candidate_project,
  Candidate_certification,
  Candidate_skill,
  Cv_document,
  Saved_job,
  Application,
  Company,
  Job_post,
  Job_skill,
  Ai_task,
  Match_result,
};
