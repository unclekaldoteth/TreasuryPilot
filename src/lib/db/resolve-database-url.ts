import path from "node:path";

const SQLITE_URL_PREFIX = "file:";

function splitSqliteUrl(databaseUrl: string) {
  const value = databaseUrl.slice(SQLITE_URL_PREFIX.length);
  const queryIndex = value.indexOf("?");

  if (queryIndex === -1) {
    return {
      filePath: value,
      query: "",
    };
  }

  return {
    filePath: value.slice(0, queryIndex),
    query: value.slice(queryIndex),
  };
}

function isAbsoluteSqlitePath(filePath: string) {
  return path.isAbsolute(filePath) || /^[A-Za-z]:[\\/]/.test(filePath);
}

export function resolveDatabaseUrl(databaseUrl: string, cwd = process.cwd()) {
  if (!databaseUrl.startsWith(SQLITE_URL_PREFIX)) {
    return databaseUrl;
  }

  const { filePath, query } = splitSqliteUrl(databaseUrl);

  if (!filePath || isAbsoluteSqlitePath(filePath)) {
    return databaseUrl;
  }

  const resolvedPath = path.resolve(cwd, filePath);
  return `${SQLITE_URL_PREFIX}${resolvedPath}${query}`;
}
