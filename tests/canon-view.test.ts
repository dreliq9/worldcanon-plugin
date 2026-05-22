import { extractWikilinks } from "../src/canon-view";

describe("extractWikilinks", () => {
  test("returns unique entity names", () => {
    expect(extractWikilinks("hi [[Aerin]] and [[Lira]] and [[Aerin]]"))
      .toEqual(["Aerin", "Lira"]);
  });

  test("strips aliases and anchors", () => {
    expect(extractWikilinks("[[Aerin|Aerin Stormborn]] and [[Magic#rules]]"))
      .toEqual(["Aerin", "Magic"]);
  });

  test("returns empty when no wikilinks", () => {
    expect(extractWikilinks("just prose, no links")).toEqual([]);
  });
});
