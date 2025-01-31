import { getDqlQuery } from "./parsers/javascript/dql-parser.js";
import { getMongoQuery } from "./parsers/javascript/mongo-parser.js";
import { getSqlQuery } from "./parsers/javascript/sql-parser.js";

const parsePageFilters = (pageFilters) => {
  const mappedFilters = buildFilterDataSourceMap(pageFilters);
  const datasetIds = Object.keys(mappedFilters);
  const queryMap = datasetIds.reduce((acc, next) => {
    const datasetFilters = mappedFilters[next];
    acc[next] = {
      dql: getDqlQuery(datasetFilters),
      mongo: datasetFilters.map(getMongoQuery),
      sql: getSqlQuery(datasetFilters),
    };
    return acc;
  }, {});
  displayResults(pageFilters, queryMap);
};

const buildFilterDataSourceMap = (pageFilters) => {
  if (
    pageFilters === undefined ||
    pageFilters === null ||
    Object.keys(pageFilters).length === 0
  )
    return {};

  return pageFilters.reduce((acc, next) => {
    const { dataSourceId } = next;
    if (acc[dataSourceId] === undefined) {
      acc[dataSourceId] = [];
    }
    acc[dataSourceId].push(next);
    return acc;
  }, {});
};

const displayResults = (pageFilters, queryMap) => {
  // Only display queries from first dataset in map
  const datasetId = Object.keys(queryMap)[0];
  const queries = queryMap[datasetId];

  // Page filters
  const pageFilterResults = document.getElementById("page-filters");
  if (pageFilterResults)
    pageFilterResults.innerHTML = JSON.stringify(pageFilters, null, 2);

  // DQL
  const dqlResults = document.getElementById("dql");
  if (dqlResults) dqlResults.innerHTML = JSON.stringify(queries.dql, null, 2);

  // Mongo
  const mongoResults = document.getElementById("mongo");
  if (mongoResults)
    mongoResults.innerHTML = JSON.stringify(queries.mongo, null, 2);

  // SQL
  const sqlResults = document.getElementById("sql");
  if (sqlResults) sqlResults.innerHTML = queries.sql;
};

window.domo.onFiltersUpdate(parsePageFilters);
