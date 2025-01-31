import { FilterOperand, FilterDataType } from "./constants.js";

export const getDqlQuery = (pageFilters) => {
  const filterQueries = pageFilters.map(buildFilterQuery);

  let whereClause;
  filterQueries.forEach((currentClause) => {
    if (whereClause !== undefined) {
      whereClause = {
        exprType: "AND",
        leftExpr: whereClause,
        rightExpr: currentClause,
        not: false,
      };
    } else {
      whereClause = currentClause;
    }
  });

  return {
    where: whereClause,
  };
};

export const buildFilterQuery = (filter) => {
  const { column, dataType, operand: op, values } = filter;

  const leftExpr = leftExprMap[op] || "EQUALS";
  const value = leftExpr === "IN" ? values : values[0];
  const isNegation =
    op === FilterOperand.NotIn || op === FilterOperand.NotEquals;

  const createComparison = (exprType, value, negation) => ({
    exprType,
    leftExpr: { exprType: "COLUMN", column },
    rightExpr: { exprType: rightExprMap[dataType], value },
    not: negation,
  });

  // Need to handle BETWEEN operator explicitly (requires AND expression)
  if (op === FilterOperand.Between) {
    return {
      exprType: "AND",
      leftExpr: createComparison("GREATER_THAN_OR_EQUAL_TO", values[0], false),
      rightExpr: createComparison("LESS_THAN_OR_EQUAL_TO", values[1], false),
      not: false,
    };
  }

  // Need to handle IN / NOT IN operator explicitly (requires selectSet)
  if (op === FilterOperand.In || op === FilterOperand.NotIn) {
    const valList = values.map((v) => ({
      exprType: rightExprMap[dataType],
      value: v,
    }));
    return {
      exprType: leftExpr,
      leftExpr: { exprType: "COLUMN", column },
      selectSet: valList,
      not: isNegation,
    };
  }

  return createComparison(leftExpr, value, isNegation);
};

const leftExprMap = {
  [FilterOperand.In]: "IN",
  [FilterOperand.NotIn]: "IN",
  [FilterOperand.Equals]: "EQUALS",
  [FilterOperand.NotEquals]: "EQUALS",
  [FilterOperand.GreaterThanOrEqualsTo]: "GREATER_THAN_OR_EQUAL_TO",
  [FilterOperand.LessThanOrEqualsTo]: "LESS_THAN_OR_EQUAL_TO",
  [FilterOperand.GreaterThan]: "GREATER_THAN",
  [FilterOperand.LessThan]: "LESS_THAN",
};

const rightExprMap = {
  [FilterDataType.String]: "STRING_VALUE",
  [FilterDataType.Numeric]: "NUMERIC_VALUE",
  [FilterDataType.Date]: "STRING_VALUE",
  [FilterDataType.Datetime]: "STRING_VALUE",
};
