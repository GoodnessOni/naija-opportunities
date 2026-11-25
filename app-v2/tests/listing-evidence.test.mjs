import { expect, it, vi } from "vitest";
import { extractListingEvidence } from "../scripts/sources/listing-evidence.mjs";

const source = "Applicants must submit a transcript. Apply through the programme portal.";
const options = { key: "test-key", model: "test-model" };
const evidence = {
  overview: null,
  eligibility: null,
  documents: "submit a transcript",
  benefits: null,
  application: "Apply through the programme portal.",
};
const output = value => ({ type: "output_text", text: JSON.stringify(value) });
const response = (content, status = "completed") => Response.json({ status, output: [{ type: "message", content }] });

it("accepts verbatim excerpts and requests strict structured output", async () => {
  const request = vi.fn(async () => response([output(evidence)]));
  await expect(extractListingEvidence(source, options, request)).resolves.toEqual(evidence);
  const [, init] = request.mock.calls[0];
  expect(JSON.parse(init.body)).toMatchObject({
    store: false,
    input: source,
    text: { format: { type: "json_schema", strict: true } },
  });
});

it("rejects evidence absent from the source", async () => {
  const request = async () => response([output({ ...evidence, benefits: "Full tuition waiver" })]);
  await expect(extractListingEvidence(source, options, request)).rejects.toThrow("Unsupported source excerpt for benefits");
});

it.each([
  ["refusal", [{ type: "refusal", refusal: "Refused" }], "completed"],
  ["incomplete output", [output(evidence)], "incomplete"],
  ["multiple outputs", [output(evidence), output(evidence)], "completed"],
])("rejects %s", async (_label, content, status) => {
  await expect(extractListingEvidence(source, options, async () => response(content, status))).rejects.toThrow();
});
