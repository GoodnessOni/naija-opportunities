import { makeSubmission, submissionInput } from "../lib/listings/submission.ts";

const clock = new Date();
const euroculture = "https://www.euroculturemaster.eu/application-procedure/";
const egei = "https://www.master-egei.eu/how-to-apply/";
const dataleum = "https://dataleum.com/gip/";

const opportunities = [
  {
    kind: "scholarship", title: "Euroculture Erasmus Mundus Scholarship",
    provider: "Euroculture Consortium", source: euroculture, apply: euroculture,
    summary: "Scholarship consideration for the 2027–2029 Euroculture joint master.",
    description: "Submit a complete admission application by the scholarship deadline. The consortium publishes separate deadlines for self-funded applicants.",
    criteria: "Applicants must meet the Euroculture admission requirements.",
    deadlineKind: "fixed", deadlineDate: "2027-01-15", timezone: "",
    round: "2027-2029",
  },
  {
    kind: "scholarship", title: "EGEI Erasmus Mundus Scholarship",
    provider: "EGEI Consortium", source: egei, apply: egei,
    summary: "Funding for the 2027–2028 joint master in economics of globalisation and European integration.",
    description: "The programme lists ten scholarships covering programme fees and contributing to living, travel, and relocation costs. Start with the eligibility survey linked from the programme page.",
    criteria: "Complete the eligibility survey before submitting the formal programme application.",
    deadlineKind: "fixed", deadlineDate: "2027-02-28", timezone: "",
    round: "2027-2028",
  },
  {
    kind: "internship", title: "Operations Intern",
    provider: "Dataleum", source: dataleum, apply: dataleum,
    summary: "Hybrid graduate internship in Lagos supporting training operations.",
    description: "The operations role works with Dataleum’s learning team on training delivery and programme coordination. The employer describes the wider graduate programme as paid and one year long.",
    criteria: "The programme lists recent tertiary graduates and current NYSC corps members. Check the role-specific application form.",
    deadlineKind: "unknown", deadlineDate: "", timezone: "",
    round: "graduate-internship",
  },
];

const drafts = opportunities.map(opportunity => makeSubmission(submissionInput.parse(opportunity), clock));
console.log(JSON.stringify(drafts, null, 2));
