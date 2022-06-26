import Stardog from "stardog-js";

export function fetchAllTriples(endpointUrl, graphId, username, password) {
  const [, endpoint, database] = endpointUrl.match(/^(.*)\/([^/]*)$/);

  const stardog = new Stardog({
    endpoint,
    database,
    auth: {
      user: username,
      pass: password,
    },
  });

  const results = new Array(5).fill(0).map((_, n) => ({
    subject: { value: "subject ", type: "uri" },
    predicate: { value: "predicate", type: "uri" },
    object: { value: "object".repeat(n), type: "literal" },
  }));
  results.push({
    subject: { value: "subject ", type: "uri" },
    predicate: {
      value: "http://www.w3.org/2000/01/rdf-schema#label",
      type: "uri",
    },
    object: { value: "LABEL", type: "literal" },
  });
  results.push({
    subject: { value: "subject ", type: "uri" },
    predicate: {
      value: "http://xmlns.com/foaf/spec/#depiction",
      type: "uri",
    },
    object: { value: "http://www.alltageinesfotoproduzenten.de/wp-content/uploads/2009/07/a70b_robert_ganzkoerper_03_9303.jpg", type: "uri" },
  })
  results.push({
    subject: { value: "bing bong", type: "uri" },
    predicate: {
      value: "http://xmlns.com/foaf/spec/#isFriend",
      type: "uri",
    },
    object: { value: "subject ", type: "uri" },
  })
  results.push({
    subject: { value: "bing bong", type: "uri" },
    predicate: {
      value: "http://xmlns.com/foaf/spec/#yeehaw",
      type: "uri",
    },
    object: { value: "kowabunga", type: "literal" },
  })
  /* return new Promise((res) => {
    res(results);
  }); */
  return stardog
    .query({
      query: "SELECT * WHERE { ?subject ?predicate ?object }",
      graph: graphId.length > 1 ? graphId : undefined,
    })
    .then((response) => {
      const bindings = response.results.bindings;
      if (bindings.length > 0) {
        return bindings;
      } else {
        throw new Error("Empty results");
      }
    });
}
