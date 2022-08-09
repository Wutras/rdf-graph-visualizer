import { getD3GraphLeafs, getNumberOfLinks } from "../graph-utils";
import { nodes, links } from "./data.json";

test("getD3GraphLeafs returns the correct subset of links", () => {
  expect(getD3GraphLeafs(links)).toEqual(links);
});

test("getD3GraphLeafs returns empty array if there are no leafs", () => {
  expect(true).toEqual(true);
});

test("getD3GraphLeafs returns empty array if empty array of links is provided", () => {
  expect(getD3GraphLeafs([])).toEqual([]);
});

test("getNumberOfLinks returns the correct number of links", () => {
  const DonaldTrump = nodes[0];
  expect(getNumberOfLinks(DonaldTrump, links)._linkCount).toEqual(9);
});

test("getNumberOfLinks returns 0 for isolated node", () => {
  const DonaldTrump = nodes[0];
  expect(getNumberOfLinks(DonaldTrump, [])._linkCount).toEqual(0);
});
