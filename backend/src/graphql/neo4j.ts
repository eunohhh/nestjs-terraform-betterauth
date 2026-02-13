import neo4j, { type Driver } from 'neo4j-driver';

export type Neo4jConfig = {
  uri: string;
  username: string;
  password: string;
  database?: string;
};

let driverSingleton: Driver | null = null;

export function getNeo4jConfigFromEnv(): Neo4jConfig | null {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE;

  if (!uri || !username || !password) {
    return null;
  }

  return { uri, username, password, database };
}

export function getNeo4jDriver(): Driver | null {
  const cfg = getNeo4jConfigFromEnv();
  if (!cfg) return null;

  if (driverSingleton) return driverSingleton;

  driverSingleton = neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.username, cfg.password), {
    // Aura uses encrypted by default; neo4j+s:// handles it.
    disableLosslessIntegers: true,
  });

  return driverSingleton;
}

export async function closeNeo4jDriver() {
  if (driverSingleton) {
    await driverSingleton.close();
    driverSingleton = null;
  }
}
