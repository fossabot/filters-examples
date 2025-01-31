import { Filters as PageFilter } from "@domoinc/toolkit";
import { getDqlQuery } from "./parsers/typescript/dql-parser";
import { getMongoQuery } from "./parsers/typescript/mongo-parser";
import { getSqlQuery } from "./parsers/typescript/sql-parser";

// @ts-ignore
window.domo.onFiltersUpdate(parsePageFilters);

const parsePageFilters = (pageFilters: PageFilter[]) => {
  const mappedFilters = buildFilterDataSourceMap(pageFilters);
  const datasetIds = Object.keys(mappedFilters);
  const queryMap = datasetIds.reduce((acc: any, next: any) => {
    const datasetFilters = mappedFilters[next];
    acc[next] = {
      dql: datasetFilters.map(getDqlQuery),
      mongo: datasetFilters.map(getMongoQuery),
      sql: getSqlQuery(datasetFilters),
    };
    return acc;
  }, {});
  displayResults(pageFilters, queryMap);
};

const buildFilterDataSourceMap = (pageFilters: PageFilter[]) => {
  if (
    pageFilters === undefined ||
    pageFilters === null ||
    Object.keys(pageFilters).length === 0
  )
    return {};

  return pageFilters.reduce((acc: any, next: any) => {
    const { dataSourceId } = next;
    if (acc[dataSourceId] === undefined) {
      acc[dataSourceId] = [];
    }
    acc[dataSourceId].push(next);
    return acc;
  }, {});
};

const displayResults = (
  pageFilters: PageFilter[],
  queryMap: Record<string, any>
) => {
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
