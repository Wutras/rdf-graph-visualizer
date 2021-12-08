import Stardog from "stardog-js";

export function fetchAllTriples(
  endpointUrl,
  graphId,
  username,
  password
) {

  const [,endpoint, database] = endpointUrl.match(/^(.*)\/([^/]*)$/)

  const stardog = new Stardog({
    endpoint,
    database,
    auth: {
      user: username,
      pass: password,
    },
  });

  return stardog.query({
    query: "SELECT * WHERE { ?subject ?predicate ?object }",
    graph: graphId.length > 1 ? graphId : undefined,
  }).then(response => response.results.bindings);
}
