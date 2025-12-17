const createClient = require("@sanity/client").createClient;

export const client = createClient({
  projectId: "ysuysqc1",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});
