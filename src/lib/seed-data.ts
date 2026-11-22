import { Attendance, Department, Settings, Staff, TrainingSession } from "@/models";

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const STAFF: [string, string, string, string][] = [
  ["ST-0101", "Avery Bennett", "Operations", "Operations Coordinator"],
  ["ST-0102", "Morgan Chen", "Technology", "Product Analyst"],
  ["ST-0103", "Riley Okafor", "People & Culture", "People Partner"],
  ["ST-0104", "Jamie Rodriguez", "Finance", "Financial Analyst"],
  ["ST-0105", "Taylor Singh", "Operations", "Process Lead"],
  ["ST-0106", "Casey Wilson", "Technology", "Software Engineer"],
  ["ST-0107", "Jordan Lee", "Sales", "Account Executive"],
  ["ST-0108", "Parker Davis", "Finance", "Accounts Manager"],
  ["ST-0109", "Samira Patel", "People & Culture", "Learning Specialist"],
  ["ST-0110", "Drew Martin", "Sales", "Sales Manager"],
  ["ST-0111", "Quinn Brooks", "Operations", "Site Supervisor"],
  ["ST-0112", "Emery Johnson", "Technology", "Systems Analyst"],
  ["ST-0113", "Alexis Moore", "Finance", "Controller"],
  ["ST-0114", "Cameron Thomas", "Sales", "Customer Success Lead"],
  ["ST-0115", "Harper Kim", "Operations", "Safety Officer"],
  ["ST-0116", "Reese Williams", "People & Culture", "Recruiter"],
  ["ST-0117", "Rowan Garcia", "Technology", "QA Engineer"],
  ["ST-0118", "Finley Brown", "Sales", "Sales Coordinator"],
  ["ST-0119", "Skyler Wilson", "Finance", "Payroll Specialist"],
  ["ST-0120", "Dakota Clark", "Operations", "Warehouse Lead"],
  ["ST-0121", "Milan Shah", "Technology", "Data Engineer"],
  ["ST-0122", "Sydney Evans", "People & Culture", "HR Coordinator"],
];

const DEPARTMENTS: [string, string][] = [
  ["Operations", "Sites, logistics, safety and process excellence"],
  ["Technology", "Product, engineering and data"],
  ["People & Culture", "Recruiting, learning and employee experience"],
  ["Finance", "Accounting, payroll and financial planning"],
  ["Sales", "New business and customer success"],
];

/** Idempotently loads fictional demonstration data. Existing records are left untouched. */
export async function seedDemoData() {
  await Settings.updateOne({ key: "global" }, { $setOnInsert: { key: "global", organization: "Northstar Co." } }, { upsert: true });

  await Department.bulkWrite(
    DEPARTMENTS.map(([name, description]) => ({
      updateOne: { filter: { name }, update: { $setOnInsert: { name, description } }, upsert: true },
    })),
  );

  await Staff.bulkWrite(
    STAFF.map(([staffId, fullName, department, jobTitle]) => ({
      updateOne: { filter: { staffId }, update: { $setOnInsert: { staffId, fullName, department, jobTitle, status: "active" } }, upsert: true },
    })),
  );

  const sessions = [
    { code: "TRN-2401", title: "Workplace Safety Essentials", trainer: "Nadia Williams", department: "All departments", date: day(-28), start: "09:00", end: "11:00", venue: "Harbor Room A", status: "Completed", qrExpiryMinutes: 10 },
    { code: "TRN-2402", title: "Data Privacy & Responsible Use", trainer: "Marcus Cole", department: "All departments", date: day(-10), start: "13:00", end: "15:00", venue: "Learning Lab 2", status: "Completed", qrExpiryMinutes: 10 },
    { code: "TRN-2403", title: "Manager Coaching Lab", trainer: "Elena Rossi", department: "All departments", date: day(0), start: "10:00", end: "12:00", venue: "Boardroom North", status: "Live", qrExpiryMinutes: 5 },
    { code: "TRN-2404", title: "Quarterly Product Briefing", trainer: "Dylan Park", department: "Technology", date: day(3), start: "14:00", end: "16:30", venue: "Studio 04", status: "Scheduled", qrExpiryMinutes: 10 },
    { code: "TRN-2405", title: "Customer Conversations", trainer: "Priya Nair", department: "Sales", date: day(9), start: "09:30", end: "11:30", venue: "Harbor Room B", status: "Draft", qrExpiryMinutes: 10 },
  ];
  await TrainingSession.bulkWrite(
    sessions.map((s) => ({ updateOne: { filter: { code: s.code }, update: { $setOnInsert: s }, upsert: true } })),
  );

  const records: { sessionCode: string; staffId: string; status: "Present" | "Absent"; checkIn: Date | null; method: string; updatedAt: Date }[] = [];
  const add = (sessionCode: string, count: number, absentEvery: number, daysAgo: number, offset = 0) => {
    for (let i = 0; i < count; i++) {
      const idx = i + offset;
      const status = i % absentEvery === 0 ? "Absent" : "Present";
      const at = new Date(Date.now() - daysAgo * 86_400_000 - idx * 600_000);
      records.push({ sessionCode, staffId: STAFF[idx][0], status, checkIn: status === "Present" ? at : null, method: status === "Present" ? "QR scan" : "Auto-close", updatedAt: at });
    }
  };
  add("TRN-2401", 16, 5, 28);
  add("TRN-2402", 14, 4, 10);
  add("TRN-2403", 7, 3, 0, 2);

  await Attendance.bulkWrite(
    records.map((r) => ({
      updateOne: {
        filter: { sessionCode: r.sessionCode, staffId: r.staffId },
        update: { $setOnInsert: { ...r, createdAt: r.updatedAt } },
        upsert: true,
        timestamps: false,
      },
    })),
  );

  return { staff: STAFF.length, sessions: sessions.length, attendance: records.length };
}
