const {
  Skill, Location, Industry, Job_level, Employment_type,
} = require("../../models");
exports.catalog = async (req, res, next) => {
  try {
    const catalogModels = {
      skills: Skill,
      locations: Location,
      industries: Industry,
      jobLevels: Job_level,
      employmentTypes: Employment_type,
    };
    const data = {};
    for (const [key, Model] of Object.entries(catalogModels)) {
      data[key] = await Model.findAll({
        where: { is_active: true },
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
    }
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};
