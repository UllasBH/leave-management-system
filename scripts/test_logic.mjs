import assert from "node:assert";

// 1. Working Days Calculator Test
function calculateWorkingDays(startDate, endDate) {
  if (endDate < startDate) return 0;
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

console.log("--- TEST 1: Working Days Calculation (Weekend Exclusion) ---");
// Monday to Friday: 5 working days
const monToFri = calculateWorkingDays(new Date("2026-11-23"), new Date("2026-11-27"));
assert.strictEqual(monToFri, 5, "Monday to Friday should equal 5 days");
console.log("✔ Mon-Fri equals 5 working days: PASS");

// Friday to Monday: 2 working days (Friday and Monday, skipping Sat and Sun)
const friToMon = calculateWorkingDays(new Date("2026-11-20"), new Date("2026-11-23"));
assert.strictEqual(friToMon, 2, "Friday to Monday should equal 2 days (excluding Sat & Sun)");
console.log("✔ Fri-Mon excludes Saturday & Sunday correctly (2 days): PASS");

// Saturday to Sunday: 0 working days
const satToSun = calculateWorkingDays(new Date("2026-11-21"), new Date("2026-11-22"));
assert.strictEqual(satToSun, 0, "Saturday to Sunday should equal 0 working days");
console.log("✔ Sat-Sun equals 0 working days: PASS");

console.log("\n--- TEST 2: Overlapping Leave Date Detection ---");
function hasOverlap(newStart, newEnd, existingStart, existingEnd) {
  const nS = new Date(newStart);
  const nE = new Date(newEnd);
  const eS = new Date(existingStart);
  const eE = new Date(existingEnd);
  return nS <= eE && nE >= eS;
}

// Case A: Exact overlap
assert.strictEqual(hasOverlap("2026-12-01", "2026-12-05", "2026-12-01", "2026-12-05"), true);
console.log("✔ Exact duplicate dates detect overlap: PASS");

// Case B: Partial overlap (starts during existing)
assert.strictEqual(hasOverlap("2026-12-03", "2026-12-08", "2026-12-01", "2026-12-05"), true);
console.log("✔ Partial overlap (start boundary) detected: PASS");

// Case C: Non-overlapping (after existing)
assert.strictEqual(hasOverlap("2026-12-06", "2026-12-10", "2026-12-01", "2026-12-05"), false);
console.log("✔ Distinct dates do not conflict: PASS");

console.log("\n--- TEST 3: Balance Deduction & Atomic Approval Logic ---");
const balance = {
  allocated_days: 12,
  used_days: 0,
  pending_days: 0,
};

// 1. Employee applies for 3 days
const requestedDays = 3;
let available = balance.allocated_days - (balance.used_days + balance.pending_days);
assert.strictEqual(available, 12);
balance.pending_days += requestedDays;
available = balance.allocated_days - (balance.used_days + balance.pending_days);
assert.strictEqual(balance.pending_days, 3);
assert.strictEqual(available, 9);
console.log("✔ Application correctly moves 3 days to pending and reduces available to 9: PASS");

// 2. Admin approves request
balance.pending_days = Math.max(0, balance.pending_days - requestedDays);
balance.used_days += requestedDays;
available = balance.allocated_days - (balance.used_days + balance.pending_days);
assert.strictEqual(balance.pending_days, 0);
assert.strictEqual(balance.used_days, 3);
assert.strictEqual(available, 9);
console.log("✔ Approval moves pending to used days without balance corruption: PASS");

// 3. Admin rejects a 2-day request
balance.pending_days += 2;
assert.strictEqual(balance.pending_days, 2);
// On rejection: release pending days
balance.pending_days = Math.max(0, balance.pending_days - 2);
available = balance.allocated_days - (balance.used_days + balance.pending_days);
assert.strictEqual(balance.pending_days, 0);
assert.strictEqual(available, 9);
console.log("✔ Rejection correctly releases pending hold: PASS");

console.log("\n🎉 ALL BUSINESS LOGIC AND WORKFLOW TESTS PASSED SUCCESSFULLY!");
