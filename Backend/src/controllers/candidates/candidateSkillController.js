const {
  Candidate_skill, Candidate_profile, Skill, sequelize,
} = require("../../models");
const AppError = require("../../utils/AppError");

function assertObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "INVALID_BODY", "Body phải là một object JSON.");
  }
}

function parsePositiveInteger(value, name) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9]\d*$/.test(String(value))) {
    throw new AppError(400, "INVALID_NUMBER", name + " phải là số nguyên dương.");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new AppError(400, "INVALID_NUMBER", name + " vượt quá giới hạn cho phép.");
  }
  return number;
}

exports.getSkills = async (req, res, next) => {
  try {
    const rows = await Candidate_skill.findAll({
      where: { candidate_id: req.user.id },
      include: [{ model: Skill, as: "skill", attributes: ["id", "name"] }],
      order: [[{ model: Skill, as: "skill" }, "name", "ASC"]],
    });
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
};

exports.replaceSkills = async (req, res, next) => {
  try {
    assertObjectBody(req.body);
    if (!Array.isArray(req.body.skills)) {
      throw new AppError(400, "INVALID_SKILLS", "skills phải là một mảng.");
    }

    const seen = new Set();
    const skills = req.body.skills.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new AppError(400, "INVALID_SKILL", "Mỗi kỹ năng phải là một object.");
      }
      const skillId = parsePositiveInteger(item.skillId, "skillId");
      if (seen.has(skillId)) {
        throw new AppError(400, "DUPLICATE_SKILL", "Danh sách có kỹ năng bị trùng.");
      }
      seen.add(skillId);
      if (
        item.proficiency != null &&
        !["BASIC", "INTERMEDIATE", "ADVANCED"].includes(item.proficiency)
      ) {
        throw new AppError(400, "INVALID_PROFICIENCY", "Mức kỹ năng không hợp lệ.");
      }
      if (item.evidence != null && typeof item.evidence !== "string") {
        throw new AppError(400, "INVALID_EVIDENCE", "evidence phải là chuỗi.");
      }
      return {
        candidate_id: req.user.id,
        skill_id: skillId,
        proficiency: item.proficiency ?? null,
        evidence: item.evidence ?? null,
      };
    });

    const transaction = await sequelize.transaction();
    try {
      const profile = await Candidate_profile.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Chưa tạo hồ sơ ứng viên.");
      if (skills.length) {
        const activeSkills = await Skill.count({
          where: { id: skills.map((skill) => skill.skill_id), is_active: true },
          transaction,
        });
        if (activeSkills !== skills.length) {
          throw new AppError(400, "UNKNOWN_SKILL", "Một hoặc nhiều kỹ năng không tồn tại hoặc đã bị tắt.");
        }
      }
      await Candidate_skill.destroy({
        where: { candidate_id: req.user.id },
        transaction,
      });
      if (skills.length) {
        await Candidate_skill.bulkCreate(skills, { transaction });
      }
      await profile.update({ profile_version: Number(profile.profile_version) + 1 }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return exports.getSkills(req, res, next);
  } catch (error) {
    return next(error);
  }
};
