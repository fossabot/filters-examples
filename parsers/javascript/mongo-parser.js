import { FilterOperand } from "./constants.js";

export const getMongoQuery = (filter) => {
  const contentSelection = `content.${filter.column}`;
  const { operand: op, values } = filter;

  const filterClause = {
    [FilterOperand.In]: { $in: values },
    [FilterOperand.NotIn]: { $nin: values },
    [FilterOperand.Equals]: { $eq: values[0] },
    [FilterOperand.NotEquals]: { $ne: values[0] },
    [FilterOperand.GreaterThanOrEqualsTo]: { $gte: values[0] },
    [FilterOperand.LessThanOrEqualsTo]: { $lte: values[0] },
    [FilterOperand.GreaterThan]: { $gt: values[0] },
    [FilterOperand.LessThan]: { $lt: values[0] },
    [FilterOperand.Between]: { $gte: values[0], $lte: values[1] },
  };

  return filterClause[op] ? { [contentSelection]: filterClause[op] } : {};
};
