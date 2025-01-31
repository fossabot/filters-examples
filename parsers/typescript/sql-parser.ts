import { Filters as PageFilter } from "@domoinc/toolkit";

// Reference:
// https://git.empdev.domo.com/CustomApps/domoapps.js/blob/master/packages/toolkit/src/clients/sql-client/index.ts#L111

interface PredicateBlock {
  aggregate: boolean;
  predicate: string;
}

export const getSqlQuery = (pageFilters: PageFilter[]) => {
  const predicateBlocks: PredicateBlock[] = pageFilters
    .map((x: PageFilter) => ({
      aggregate: Boolean(x.aggregated),
      predicate: filterToSQLPredicate(x),
    }))
    .filter(
      ({ predicate }: any) =>
        (predicate === undefined ? "" : predicate).length > 0
    );

  const clauses = sqlPredicatesToClauses(predicateBlocks);
  return `SELECT * FROM table ${
    clauses.where ? `WHERE ${clauses.where}` : ""
  } ${clauses.having ? `HAVING ${clauses.having}` : ""}`;
};

const sqlPredicatesToClauses = (
  predicateBlocks: PredicateBlock[]
): { where: string | undefined; having: string | undefined } => {
  let whereClause = "";
  let havingClause = "";
  let whereClauseCounter = 0;
  let havingClauseCounter = 0;

  predicateBlocks.forEach((block: PredicateBlock) => {
    if (block.aggregate === true) {
      havingClause += `${havingClauseCounter > 0 ? " AND " : ""}${
        block.predicate
      }`;
      havingClauseCounter += 1;
    } else {
      whereClause += `${whereClauseCounter > 0 ? " AND " : ""}${
        block.predicate
      }`;
      whereClauseCounter += 1;
    }
  });

  return {
    where: whereClauseCounter > 0 ? whereClause : undefined,
    having: havingClauseCounter > 0 ? havingClause : undefined,
  };
};

const filterToSQLPredicate = (filter: PageFilter) => {
  const parser = sqlOperationParsers[filter.operand];
  const columnName =
    Boolean(filter.aggregated) && filter.aggregation !== undefined
      ? `${filter.aggregation}("${filter.column}")`
      : `"${filter.column}"`;
  return parser(columnName, filter);
};

const sqlOperationParsers: Record<
  string,
  (columnName: string, filter: PageFilter) => string
> = {
  IN: (columnName: string, filter: PageFilter) =>
    buildINClause(columnName, filter),
  NOT_IN: (columnName: string, filter: PageFilter) =>
    buildINClause(columnName, filter, false),
  GREATER_THAN: (columnName: string, filter: PageFilter) =>
    `${columnName} > ${getExpressionValue(filter, filter.values[0])}`,
  GREAT_THAN_EQUALS_TO: (columnName: string, filter: PageFilter) =>
    `${columnName} >= ${getExpressionValue(filter, filter.values[0])}`,
  LESS_THAN: (columnName: string, filter: PageFilter) =>
    `${columnName} < ${getExpressionValue(filter, filter.values[0])}`,
  LESS_THAN_EQUALS_TO: (columnName: string, filter: PageFilter) =>
    `${columnName} <= ${getExpressionValue(filter, filter.values[0])}`,
  BETWEEN: (columnName: string, filter: PageFilter) => {
    if (filter.values.length < 2) {
      return "";
    }
    return `(${columnName} >= ${getExpressionValue(
      filter,
      filter.values[0]
    )} AND ${columnName} <= ${getExpressionValue(filter, filter.values[1])})`;
  },
  EQUALS: (columnName: string, filter: PageFilter) =>
    `${columnName} = ${getExpressionValue(filter, filter.values[0])}`,
  NOT_EQUALS: (columnName: string, filter: PageFilter) =>
    `${columnName} != ${getExpressionValue(filter, filter.values[0])}`,
  LIKE: (columnName: string, filter: PageFilter) =>
    `${columnName} LIKE ${getExpressionValue(filter, filter.values[0])}`,
};

const getExpressionValue = (filter: PageFilter, value: any) => {
  const prefix = filter.operand === "LIKE" ? "%" : "";
  const suffix = filter.operand === "LIKE" ? "%" : "";
  if (filter.aggregated === true) return value;
  switch (filter.dataType) {
    case "string":
    case "date":
    case "datetime":
      return `'${prefix}${value}${suffix}'`;
    case "numeric":
      return value;
  }
};

const buildINClause = (
  columnName: string,
  filter: PageFilter,
  notIn = false
) => {
  // "NaN": see comment below, in "joinINValues" method
  const hasNull = filter.values.some(
    (x: any) => x === null || (filter.dataType !== "string" && x === "NaN")
  );
  const inOperand = notIn ? "NOT IN" : "IN";
  const predicateIN = joinINValues(filter);
  const hasPredicateIN = predicateIN.length > 0;
  const clauseIN = hasPredicateIN
    ? `${columnName} ${inOperand} (${predicateIN})`
    : "";
  if (hasNull === true) {
    const nullOperand = notIn ? "IS NOT" : "IS";
    const andOr = notIn ? "AND" : "OR";
    return `(${
      hasPredicateIN ? `${clauseIN} ${andOr}` : ""
    } ${columnName} ${nullOperand} NULL)`;
  }
  return clauseIN;
};

const joinINValues = (filter: PageFilter) => {
  if (filter.values === undefined) return "";
  const values = filter.values.filter((x: any) => {
    // there's a bug in page filters where the NULL value is transformed
    // to the string-type word 'NaN' after the page filter is applied,
    // and that same word is passed to the card as an actual applied filter.
    if (filter.dataType !== "string" && x === "NaN") {
      return false;
    }
    return x !== null;
  });
  if (values.length === 0) return "";
  switch (filter.dataType) {
    case "string":
    case "date":
    case "datetime":
      return values.map((x: any) => `'${x}'`).join(",");
    case "numeric":
      return values.join(",");
    default:
      return values.join(",");
  }
};
