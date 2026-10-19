export const demoReports = [
  {
    id: "report-a",
    label: "Report A",
    source: "Event organizer",
    type: "Firsthand account",
    time: "10:34 AM",
    text: "The payment terminal stopped working around 10:05 AM. Attendees could still register with cash. The terminal displayed a network error.",
  },
  {
    id: "report-b",
    label: "Report B",
    source: "Student volunteer",
    type: "Firsthand account",
    time: "10:41 AM",
    text: "Registration payments failed shortly after 10 AM. The Wi-Fi appeared normal on nearby phones. The terminal may have run out of battery.",
  },
  {
    id: "report-c",
    label: "Report C",
    source: "Venue technician",
    type: "Technical note",
    time: "10:52 AM",
    text: "The venue network was restarted at 10:20 AM after an unrelated access-point issue. We did not inspect the payment terminal.",
  },
];

export const demoClaims = [
  {
    id: "claim-failure-time",
    text: "Payment registration failed shortly after 10:00 AM.",
    status: "confirmed",
    explanation:
      "The organizer and volunteer both place the failure shortly after 10 AM.",
    sourceIds: ["report-a", "report-b"],
    evidence: [
      {
        reportId: "report-a",
        quote: "The payment terminal stopped working around 10:05 AM.",
      },
      {
        reportId: "report-b",
        quote: "Registration payments failed shortly after 10 AM.",
      },
    ],
    reviewed: false,
    note: "",
  },
  {
    id: "claim-cash-fallback",
    text: "Cash registration remained available.",
    status: "confirmed",
    explanation:
      "The event organizer explicitly states that attendees could still register with cash.",
    sourceIds: ["report-a"],
    evidence: [
      {
        reportId: "report-a",
        quote: "Attendees could still register with cash.",
      },
    ],
    reviewed: false,
    note: "",
  },
  {
    id: "claim-network-cause",
    text: "A network failure caused the payment terminal outage.",
    status: "conflicting",
    explanation:
      "A network error appeared on the terminal, but nearby Wi-Fi appeared normal and the later network restart was described as unrelated. The cause is not established.",
    sourceIds: ["report-a", "report-b", "report-c"],
    evidence: [
      {
        reportId: "report-a",
        quote: "The terminal displayed a network error.",
      },
      {
        reportId: "report-b",
        quote: "The Wi-Fi appeared normal on nearby phones.",
      },
      {
        reportId: "report-c",
        quote:
          "The venue network was restarted at 10:20 AM after an unrelated access-point issue.",
      },
    ],
    reviewed: false,
    note: "",
  },
  {
    id: "claim-battery-cause",
    text: "The terminal may have run out of battery.",
    status: "unverified",
    explanation:
      "This is an inference from the volunteer, not a confirmed observation. No report records the terminal battery level.",
    sourceIds: ["report-b"],
    evidence: [
      {
        reportId: "report-b",
        quote: "The terminal may have run out of battery.",
      },
    ],
    reviewed: false,
    note: "",
  },
  {
    id: "claim-missing-logs",
    text: "Terminal battery level and connectivity logs are still missing.",
    status: "missing",
    explanation:
      "No report includes the terminal battery level, terminal logs, or payment-provider logs needed to identify the cause.",
    sourceIds: [],
    evidence: [],
    reviewed: false,
    note: "",
  },
];

export const demoCase = {
  id: "campus-fair-payment",
  eyebrow: "Demo investigation · fictional sample data",
  title: "Campus Innovation Fair payment failure",
  description:
    "Three reports, one broken payment flow, and a cause that still needs evidence.",
  updated: "Today, 10:58 AM",
  reports: demoReports,
  claims: demoClaims,
  briefApproved: false,
  briefNote: "",
};

export function cloneDemoCase() {
  return JSON.parse(JSON.stringify(demoCase));
}
