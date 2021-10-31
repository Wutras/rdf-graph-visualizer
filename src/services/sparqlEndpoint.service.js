import Stardog from "stardog-js";

export function fetchAllTriples(
  endpointUrl,
  graphId,
  username,
  password
) {

  if (endpointUrl.endsWith("/")) endpointUrl = endpointUrl.slice(0, -1);

  const stardog = new Stardog({
    endpoint: endpointUrl,
    database: "qanary",
    auth: {
      user: username,
      pass: password,
    },
  });

  return stardog.query({
    query: "SELECT * WHERE { ?subject ?predicate ?object }",
    graph: graphId,
  }).then(response => response.results.bindings);
}
