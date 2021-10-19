export function fetchAllTriples(endpointUrl, graphId) {
  return fetch(endpointUrl + graphId, {
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      if (response?.ok && response?.json) {
        return response.json();
      } else {
        throw new Error("Response was not ok");
      }
    })
    .then((data) => {
      console.debug(data);
      return data;
    })
    .catch((errorMessage) => {
      console.error(errorMessage);
      return [];
    });
}
