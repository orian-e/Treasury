import { MongoClient, ObjectId, Db } from "mongodb";
import * as dotenv from "dotenv";
import * as bcrypt from "bcryptjs";

// Load dev environment
dotenv.config({ path: ".env.development" });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI not set in .env.development");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomDate(from: Date, to: Date): Date {
  return new Date(
    from.getTime() + Math.random() * (to.getTime() - from.getTime())
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split equally, last person absorbs the rounding remainder. */
function equalSplit(amount: number, count: number): number[] {
  const share = round2(amount / count);
  const parts = Array(count).fill(share);
  const remainder = round2(amount - share * count);
  parts[parts.length - 1] = round2(parts[parts.length - 1] + remainder);
  return parts;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Connecting to MongoDB…");
  const client = new MongoClient(MONGO_URI!);
  await client.connect();
  const db: Db = client.db(); // uses the db name from the URI
  console.log("✅ Connected.\n");

  const usersCol = db.collection("users");
  const groupsCol = db.collection("groups");
  const expensesCol = db.collection("expenses");

  // ── 1. Wipe ────────────────────────────────────────────────────────────────
  console.log("🗑  Clearing existing data…");
  await Promise.all([
    usersCol.deleteMany({}),
    groupsCol.deleteMany({}),
    expensesCol.deleteMany({}),
  ]);
  console.log("   Done.\n");

  // ── 2. Registered users ────────────────────────────────────────────────────
  console.log("👤 Creating registered users…");
  const pwHash = await hashPassword("password123");

  const registeredData = [
    { name: "Alice Martin",    email: "alice@example.com",  isAdmin: true },
    { name: "Bob Chen",        email: "bob@example.com",    isAdmin: false },
    { name: "Clara Fernández", email: "clara@example.com",  isAdmin: false },
    { name: "David Müller",    email: "david@example.com",  isAdmin: false },
    { name: "Emma Wilson",     email: "emma@example.com",   isAdmin: false },
    { name: "Frank Rossi",     email: "frank@example.com",  isAdmin: false },
    { name: "Grace Kim",       email: "grace@example.com",  isAdmin: false },
    { name: "Hugo Dupont",     email: "hugo@example.com",   isAdmin: false },
    // Hebrew names for RTL testing
    { name: "נועה כהן",        email: "noa@example.com",    isAdmin: false },
    { name: "יוסי לוי",        email: "yossi@example.com",  isAdmin: false },
    { name: "מיכל אברהם",      email: "michal@example.com", isAdmin: false },
    { name: "Solitary Sam",    email: "sam@example.com",    isAdmin: false },
  ];

  const registeredUsers: { _id: ObjectId; name: string }[] = [];
  for (const ud of registeredData) {
    const _id = new ObjectId();
    await usersCol.insertOne({
      _id,
      ...ud,
      passwordHash: pwHash,
      groupIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    registeredUsers.push({ _id, name: ud.name });
    console.log(`   ✓ ${ud.name} (${ud.email})`);
  }

  const [alice, bob, clara, david, emma, frank, grace, hugo, noa, yossi, michal, sam] = registeredUsers;

  // ── 3. Groups ──────────────────────────────────────────────────────────────
  console.log("\n📁 Creating groups…");

  function generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  const now = new Date();
  const groupDefs = [
    { name: "Flatmates 🏠",        description: "Day-to-day shared flat expenses",                       creatorId: alice._id },
    { name: "Trip to Barcelona ✈️", description: "Our Barcelona adventure — flights, food & fun",         creatorId: bob._id },
    { name: "Office Lunch Club 🍕", description: "Splitting lunches and coffee runs",                     creatorId: emma._id },
    { name: "Building Co-owners 🏢",description: "Shared maintenance: garden, plumbing, internet infra",  creatorId: alice._id },
    { name: "ארוחות משפחתיות 🍽️",  description: "הוצאות משותפות למשפחה",                                  creatorId: noa._id },
    { name: "Sam's Trackers 👤", description: "Personal expense tracking", creatorId: sam._id },
  ];

  const groups: { _id: ObjectId; name: string }[] = [];
  for (const gd of groupDefs) {
    const _id = new ObjectId();
    const inviteCode = generateInviteCode();
    await groupsCol.insertOne({
      _id,
      ...gd,
      inviteCode,
      createdAt: now,
      updatedAt: now,
    });
    groups.push({ _id, name: gd.name });
    console.log(`   ✓ ${gd.name}  (invite: ${inviteCode})`);
  }

  const [flatmates, trip, office, building, family, samGroup] = groups;

  // ── 4. Guest users ─────────────────────────────────────────────────────────
  console.log("\n👻 Creating guest users…");

  async function createGuest(name: string, groupId: ObjectId) {
    const _id = new ObjectId();
    await usersCol.insertOne({
      _id,
      name,
      groupIds: [groupId],
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`   ✓ ${name}`);
    return { _id, name };
  }

  const tripGuest = await createGuest("Luis (Guide)", trip._id);
  const officeGuest1 = await createGuest("Priya (Intern)", office._id);
  const officeGuest2 = await createGuest("Tomas (Contractor)", office._id);
  const buildingGuest = await createGuest("Old Owner (Mr. Bernard)", building._id);
  // Hebrew guests
  const familyGuest1 = await createGuest("דני", family._id);
  const familyGuest2 = await createGuest("שירה", family._id);

  // ── 5. Assign users to groups ──────────────────────────────────────────────
  console.log("\n🔗 Assigning users to groups…");

  const groupMemberships: Record<string, { _id: ObjectId; name: string }[]> = {
    flatmates: [alice, bob, clara, noa],
    trip:      [bob, clara, david, emma],
    office:    [emma, frank, grace],
    building:  [alice, david, frank, hugo],
    family:    [noa, yossi, michal, emma],
    samGroup:  [sam],
  };

  const groupIdMap: Record<string, ObjectId> = {
    flatmates: flatmates._id,
    trip: trip._id,
    office: office._id,
    building: building._id,
    family: family._id,
    samGroup: samGroup._id,
  };

  for (const [key, members] of Object.entries(groupMemberships)) {
    const gid = groupIdMap[key];
    for (const member of members) {
      await usersCol.updateOne(
        { _id: member._id },
        { $addToSet: { groupIds: gid } }
      );
    }
  }
  console.log("   Done.\n");

  // ── 6. Expenses ────────────────────────────────────────────────────────────
  console.log("💸 Creating expenses…\n");

  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const yearsAgo = (y: number) => new Date(now.getFullYear() - y, now.getMonth(), now.getDate());

  let count = 0;

  type U = { _id: ObjectId; name: string };

  async function addExpense(opts: {
    description: string;
    amount: number;
    currency: string;
    date: Date;
    groupId: ObjectId;
    groupLabel: string;
    splitType: "equal" | "percentage" | "custom";
    payers: { userId: ObjectId; userName: string; amount: number; type: string; percentage?: number }[];
    splits: { userId: ObjectId; userName: string; amount: number; type: string; percentage?: number; paid?: boolean }[];
    createdBy: ObjectId;
  }) {
    const totalPaid = round2(opts.payers.reduce((s, p) => s + p.amount, 0));
    const totalOwed = round2(opts.splits.reduce((s, p) => s + p.amount, 0));

    await expensesCol.insertOne({
      description: opts.description,
      amount: opts.amount,
      currency: opts.currency,
      date: opts.date,
      groupId: opts.groupId.toString(),
      splitType: opts.splitType,
      payers: opts.payers.map((p) => ({
        userId: p.userId.toString(),
        userName: p.userName,
        amount: p.amount,
        type: p.type,
        ...(p.percentage != null ? { percentage: p.percentage } : {}),
      })),
      splits: opts.splits.map((s) => ({
        userId: s.userId.toString(),
        userName: s.userName,
        amount: s.amount,
        type: s.type,
        paid: s.paid ?? false,
        ...(s.percentage != null ? { percentage: s.percentage } : {}),
      })),
      totalPaid,
      totalOwed,
      createdBy: opts.createdBy.toString(),
      createdAt: opts.date,
      updatedAt: opts.date,
    });
    count++;
    console.log(
      `   [${opts.groupLabel}] ${opts.description}  —  ${opts.amount} ${opts.currency}`
    );
  }

  // Helper for equal-split builder
  function eqSplits(users: U[], amount: number) {
    const shares = equalSplit(amount, users.length);
    return users.map((u, i) => ({
      userId: u._id as any, userName: u.name, amount: shares[i], type: "equal" as const,
    }));
  }

  // ────────────── FLATMATES (no guests, recent + 1y-old, EUR) ──────────────

  // Equal — Groceries
  await addExpense({
    description: "Weekly groceries",
    amount: 87.60, currency: "EUR", date: daysAgo(3),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "equal",
    payers: [{ userId: alice._id, userName: alice.name, amount: 87.60, type: "equal" }],
    splits: eqSplits([alice, bob, clara], 87.60),
    createdBy: alice._id,
  });

  // Custom — Electricity
  await addExpense({
    description: "Electricity bill — March",
    amount: 120, currency: "EUR", date: daysAgo(10),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "custom",
    payers: [{ userId: bob._id, userName: bob.name, amount: 120, type: "custom" }],
    splits: [
      { userId: alice._id, userName: alice.name, amount: 55, type: "custom" },
      { userId: bob._id,   userName: bob.name,   amount: 35, type: "custom" },
      { userId: clara._id, userName: clara.name, amount: 30, type: "custom" },
    ],
    createdBy: bob._id,
  });

  // Percentage — Internet
  await addExpense({
    description: "Internet subscription",
    amount: 45, currency: "EUR", date: daysAgo(15),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "percentage",
    payers: [{ userId: clara._id, userName: clara.name, amount: 45, type: "percentage" }],
    splits: [
      { userId: alice._id, userName: alice.name, amount: 18,   type: "percentage", percentage: 40 },
      { userId: bob._id,   userName: bob.name,   amount: 13.5, type: "percentage", percentage: 30 },
      { userId: clara._id, userName: clara.name, amount: 13.5, type: "percentage", percentage: 30 },
    ],
    createdBy: clara._id,
  });

  // Multi-payer — Cleaning supplies
  await addExpense({
    description: "Cleaning supplies",
    amount: 32.50, currency: "EUR", date: daysAgo(1),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "equal",
    payers: [
      { userId: alice._id, userName: alice.name, amount: 20,    type: "custom" },
      { userId: bob._id,   userName: bob.name,   amount: 12.50, type: "custom" },
    ],
    splits: eqSplits([alice, bob, clara], 32.50),
    createdBy: alice._id,
  });

  // 1-year old — Security deposit
  await addExpense({
    description: "Security deposit top-up",
    amount: 950, currency: "EUR", date: randomDate(yearsAgo(1), daysAgo(300)),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "equal",
    payers: [{ userId: alice._id, userName: alice.name, amount: 950, type: "equal" }],
    splits: eqSplits([alice, bob, clara], 950),
    createdBy: alice._id,
  });

  // GBP — UK online order
  await addExpense({
    description: "IKEA order (UK warehouse)",
    amount: 189, currency: "GBP", date: daysAgo(25),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "equal",
    payers: [{ userId: bob._id, userName: bob.name, amount: 189, type: "equal" }],
    splits: eqSplits([alice, bob, clara, noa], 189),
    createdBy: bob._id,
  });

  // ────────────── TRIP (1 guest, recent, multi-currency) ──────────────

  const allTrip: U[] = [bob, clara, david, emma, tripGuest];
  const tripRegistered: U[] = [bob, clara, david, emma];

  // Flights (GBP, no guest)
  await addExpense({
    description: "Group flights — Ryanair",
    amount: 480, currency: "GBP", date: daysAgo(20),
    groupId: trip._id, groupLabel: "Trip", splitType: "equal",
    payers: [{ userId: bob._id, userName: bob.name, amount: 480, type: "equal" }],
    splits: eqSplits(tripRegistered, 480),
    createdBy: bob._id,
  });

  // Airbnb (EUR, custom — David had single room)
  await addExpense({
    description: "Airbnb — 4 nights",
    amount: 720, currency: "EUR", date: daysAgo(18),
    groupId: trip._id, groupLabel: "Trip", splitType: "custom",
    payers: [{ userId: clara._id, userName: clara.name, amount: 720, type: "custom" }],
    splits: [
      { userId: bob._id,   userName: bob.name,   amount: 160, type: "custom" },
      { userId: clara._id, userName: clara.name, amount: 160, type: "custom" },
      { userId: david._id, userName: david.name, amount: 240, type: "custom" },
      { userId: emma._id,  userName: emma.name,  amount: 160, type: "custom" },
    ],
    createdBy: clara._id,
  });

  // Dinner (EUR, includes guest)
  await addExpense({
    description: "Dinner at La Boqueria",
    amount: 185.50, currency: "EUR", date: daysAgo(16),
    groupId: trip._id, groupLabel: "Trip", splitType: "equal",
    payers: [{ userId: david._id, userName: david.name, amount: 185.50, type: "equal" }],
    splits: eqSplits(allTrip, 185.50),
    createdBy: david._id,
  });

  // Walking tour (EUR, multi-payer, includes guest)
  await addExpense({
    description: "Walking tour & tips",
    amount: 75, currency: "EUR", date: daysAgo(15),
    groupId: trip._id, groupLabel: "Trip", splitType: "equal",
    payers: [
      { userId: emma._id, userName: emma.name, amount: 50, type: "custom" },
      { userId: bob._id,  userName: bob.name,  amount: 25, type: "custom" },
    ],
    splits: eqSplits(allTrip, 75),
    createdBy: emma._id,
  });

  // Taxi (EUR, subset of members)
  await addExpense({
    description: "Taxi to airport",
    amount: 42, currency: "EUR", date: daysAgo(14),
    groupId: trip._id, groupLabel: "Trip", splitType: "equal",
    payers: [{ userId: bob._id, userName: bob.name, amount: 42, type: "equal" }],
    splits: eqSplits([bob, david, emma], 42),
    createdBy: bob._id,
  });

  // ────────────── OFFICE (2 guests, recent, EUR + USD) ──────────────

  const allOffice: U[] = [emma, frank, grace, officeGuest1, officeGuest2];

  // Pizza Friday
  await addExpense({
    description: "Pizza Friday 🍕",
    amount: 62, currency: "EUR", date: daysAgo(7),
    groupId: office._id, groupLabel: "Office", splitType: "equal",
    payers: [{ userId: frank._id, userName: frank.name, amount: 62, type: "equal" }],
    splits: eqSplits(allOffice, 62),
    createdBy: frank._id,
  });

  // Coffee run (subset)
  await addExpense({
    description: "Morning coffees ☕",
    amount: 14.80, currency: "EUR", date: daysAgo(2),
    groupId: office._id, groupLabel: "Office", splitType: "equal",
    payers: [{ userId: grace._id, userName: grace.name, amount: 14.80, type: "equal" }],
    splits: eqSplits([grace, emma, officeGuest1], 14.80),
    createdBy: grace._id,
  });

  // Team lunch (percentage — interns pay less)
  await addExpense({
    description: "Team lunch — sushi place",
    amount: 95, currency: "EUR", date: daysAgo(12),
    groupId: office._id, groupLabel: "Office", splitType: "percentage",
    payers: [{ userId: emma._id, userName: emma.name, amount: 95, type: "percentage" }],
    splits: [
      { userId: emma._id,         userName: emma.name,         amount: 28.5,  type: "percentage", percentage: 30 },
      { userId: frank._id,        userName: frank.name,        amount: 28.5,  type: "percentage", percentage: 30 },
      { userId: grace._id,        userName: grace.name,        amount: 23.75, type: "percentage", percentage: 25 },
      { userId: officeGuest1._id, userName: officeGuest1.name, amount: 9.5,   type: "percentage", percentage: 10 },
      { userId: officeGuest2._id, userName: officeGuest2.name, amount: 4.75,  type: "percentage", percentage: 5 },
    ],
    createdBy: emma._id,
  });

  // USD — conference supplies
  await addExpense({
    description: "Office supplies from US conference",
    amount: 156, currency: "USD", date: daysAgo(45),
    groupId: office._id, groupLabel: "Office", splitType: "equal",
    payers: [{ userId: frank._id, userName: frank.name, amount: 156, type: "equal" }],
    splits: eqSplits([emma, frank, grace], 156),
    createdBy: frank._id,
  });

  // ────────────── BUILDING (1 guest, multi-year span, EUR) ──────────────

  const allBuilding: U[] = [alice, david, frank, hugo, buildingGuest];
  const buildingOwners: U[] = [alice, david, frank, hugo]; // without guest

  // ~3-4 years ago — Garden redesign
  await addExpense({
    description: "Garden redesign — landscaping",
    amount: 2400, currency: "EUR", date: randomDate(yearsAgo(4), yearsAgo(3)),
    groupId: building._id, groupLabel: "Building", splitType: "equal",
    payers: [{ userId: alice._id, userName: alice.name, amount: 2400, type: "equal" }],
    splits: eqSplits(allBuilding, 2400),
    createdBy: alice._id,
  });

  // ~3-4 years ago — Intercom replacement (multi-payer)
  await addExpense({
    description: "Replace entrance intercom system",
    amount: 850, currency: "EUR", date: randomDate(yearsAgo(4), yearsAgo(3)),
    groupId: building._id, groupLabel: "Building", splitType: "equal",
    payers: [
      { userId: david._id, userName: david.name, amount: 500, type: "custom" },
      { userId: hugo._id,  userName: hugo.name,  amount: 350, type: "custom" },
    ],
    splits: eqSplits(allBuilding, 850),
    createdBy: david._id,
  });

  // ~2-3 years ago — Water pipe
  await addExpense({
    description: "Water pipe replacement (basement)",
    amount: 3200, currency: "EUR", date: randomDate(yearsAgo(3), yearsAgo(2)),
    groupId: building._id, groupLabel: "Building", splitType: "custom",
    payers: [{ userId: frank._id, userName: frank.name, amount: 3200, type: "custom" }],
    splits: [
      { userId: alice._id,         userName: alice.name,         amount: 800, type: "custom" },
      { userId: david._id,         userName: david.name,         amount: 800, type: "custom" },
      { userId: frank._id,         userName: frank.name,         amount: 640, type: "custom" },
      { userId: hugo._id,          userName: hugo.name,          amount: 640, type: "custom" },
      { userId: buildingGuest._id, userName: buildingGuest.name, amount: 320, type: "custom" },
    ],
    createdBy: frank._id,
  });

  // ~1-2 years ago — Fibre internet
  await addExpense({
    description: "Fibre internet installation for building",
    amount: 1800, currency: "EUR", date: randomDate(yearsAgo(2), yearsAgo(1)),
    groupId: building._id, groupLabel: "Building", splitType: "equal",
    payers: [{ userId: hugo._id, userName: hugo.name, amount: 1800, type: "equal" }],
    splits: eqSplits(allBuilding, 1800),
    createdBy: hugo._id,
  });

  // ~30 days ago — Garden sprinkler (no guest)
  await addExpense({
    description: "Garden sprinkler repair",
    amount: 420, currency: "EUR", date: daysAgo(30),
    groupId: building._id, groupLabel: "Building", splitType: "equal",
    payers: [{ userId: alice._id, userName: alice.name, amount: 420, type: "equal" }],
    splits: eqSplits(buildingOwners, 420),
    createdBy: alice._id,
  });

  // Recent — Hallway repainting (multi-payer, all members)
  await addExpense({
    description: "Hallway repainting — paint + labour",
    amount: 275, currency: "EUR", date: daysAgo(8),
    groupId: building._id, groupLabel: "Building", splitType: "equal",
    payers: [
      { userId: david._id, userName: david.name, amount: 150, type: "custom" },
      { userId: alice._id, userName: alice.name, amount: 125, type: "custom" },
    ],
    splits: eqSplits(allBuilding, 275),
    createdBy: david._id,
  });

  // USD — imported materials
  await addExpense({
    description: "Imported door hinges (Amazon US)",
    amount: 95, currency: "USD", date: daysAgo(40),
    groupId: building._id, groupLabel: "Building", splitType: "equal",
    payers: [{ userId: hugo._id, userName: hugo.name, amount: 95, type: "equal" }],
    splits: eqSplits(buildingOwners, 95),
    createdBy: hugo._id,
  });

  // ────────────── FAMILY (Hebrew names, ILS, registered + guests) ──────────────

  const allFamily: U[] = [noa, yossi, michal, emma, familyGuest1, familyGuest2];
  const familyRegistered: U[] = [noa, yossi, michal, emma];

  // סופר — grocery shopping
  await addExpense({
    description: "קניות בסופר",
    amount: 340, currency: "ILS", date: daysAgo(5),
    groupId: family._id, groupLabel: "Family", splitType: "equal",
    payers: [{ userId: noa._id, userName: noa.name, amount: 340, type: "equal" }],
    splits: eqSplits(allFamily, 340),
    createdBy: noa._id,
  });

  // חשמל — electricity bill, custom split
  await addExpense({
    description: "חשבון חשמל — פברואר",
    amount: 520, currency: "ILS", date: daysAgo(12),
    groupId: family._id, groupLabel: "Family", splitType: "custom",
    payers: [{ userId: yossi._id, userName: yossi.name, amount: 520, type: "custom" }],
    splits: [
      { userId: noa._id,          userName: noa.name,          amount: 130, type: "custom" },
      { userId: yossi._id,        userName: yossi.name,        amount: 130, type: "custom" },
      { userId: michal._id,       userName: michal.name,       amount: 130, type: "custom" },
      { userId: familyGuest1._id, userName: familyGuest1.name, amount: 80,  type: "custom" },
      { userId: familyGuest2._id, userName: familyGuest2.name, amount: 50,  type: "custom" },
    ],
    createdBy: yossi._id,
  });

  // ארוחת שישי — Friday dinner, multi-payer
  await addExpense({
    description: "ארוחת שישי במסעדה",
    amount: 750, currency: "ILS", date: daysAgo(3),
    groupId: family._id, groupLabel: "Family", splitType: "equal",
    payers: [
      { userId: noa._id,    userName: noa.name,    amount: 400, type: "custom" },
      { userId: michal._id, userName: michal.name, amount: 350, type: "custom" },
    ],
    splits: eqSplits(allFamily, 750),
    createdBy: noa._id,
  });

  // גז — gas bill (only registered members)
  await addExpense({
    description: "חשבון גז",
    amount: 180, currency: "ILS", date: daysAgo(20),
    groupId: family._id, groupLabel: "Family", splitType: "equal",
    payers: [{ userId: michal._id, userName: michal.name, amount: 180, type: "equal" }],
    splits: eqSplits(familyRegistered, 180),
    createdBy: michal._id,
  });

  // מתנה — gift, percentage split
  await addExpense({
    description: "מתנה ליום הולדת של סבתא",
    amount: 400, currency: "ILS", date: daysAgo(8),
    groupId: family._id, groupLabel: "Family", splitType: "percentage",
    payers: [{ userId: yossi._id, userName: yossi.name, amount: 400, type: "percentage" }],
    splits: [
      { userId: noa._id,          userName: noa.name,          amount: 120, type: "percentage", percentage: 30 },
      { userId: yossi._id,        userName: yossi.name,        amount: 120, type: "percentage", percentage: 30 },
      { userId: michal._id,       userName: michal.name,       amount: 80,  type: "percentage", percentage: 20 },
      { userId: familyGuest1._id, userName: familyGuest1.name, amount: 40,  type: "percentage", percentage: 10 },
      { userId: familyGuest2._id, userName: familyGuest2.name, amount: 40,  type: "percentage", percentage: 10 },
    ],
    createdBy: yossi._id,
  });
  // ────────────── MIXED Hebrew+English expenses ──────────────

  // Flatmates: נועה joined — mixed names in splits (EUR)
  await addExpense({
    description: "ארוחת ערב משותפת — Shared dinner",
    amount: 96, currency: "EUR", date: daysAgo(2),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "equal",
    payers: [{ userId: noa._id, userName: noa.name, amount: 96, type: "equal" }],
    splits: eqSplits([alice, bob, clara, noa], 96),
    createdBy: noa._id,
  });

  // Flatmates: multi-payer with Hebrew + English payers
  await addExpense({
    description: "Groceries + קניות לשבת",
    amount: 110, currency: "EUR", date: daysAgo(1),
    groupId: flatmates._id, groupLabel: "Flatmates", splitType: "equal",
    payers: [
      { userId: alice._id, userName: alice.name, amount: 60, type: "custom" },
      { userId: noa._id,   userName: noa.name,   amount: 50, type: "custom" },
    ],
    splits: eqSplits([alice, bob, clara, noa], 110),
    createdBy: alice._id,
  });

  // Family: Emma joined — English user in Hebrew group (ILS)
  await addExpense({
    description: "Pizza night — פיצה בערב",
    amount: 280, currency: "ILS", date: daysAgo(1),
    groupId: family._id, groupLabel: "Family", splitType: "equal",
    payers: [{ userId: emma._id, userName: emma.name, amount: 280, type: "equal" }],
    splits: eqSplits(allFamily, 280),
    createdBy: emma._id,
  });

  // Family: multi-payer — Emma + יוסי pay, mixed split list
  await addExpense({
    description: "Taxi to airport — מונית לשדה התעופה",
    amount: 350, currency: "ILS", date: daysAgo(4),
    groupId: family._id, groupLabel: "Family", splitType: "custom",
    payers: [
      { userId: emma._id,  userName: emma.name,  amount: 200, type: "custom" },
      { userId: yossi._id, userName: yossi.name, amount: 150, type: "custom" },
    ],
    splits: [
      { userId: noa._id,          userName: noa.name,          amount: 80,  type: "custom" },
      { userId: yossi._id,        userName: yossi.name,        amount: 80,  type: "custom" },
      { userId: michal._id,       userName: michal.name,       amount: 70,  type: "custom" },
      { userId: emma._id,         userName: emma.name,         amount: 70,  type: "custom" },
      { userId: familyGuest1._id, userName: familyGuest1.name, amount: 25,  type: "custom" },
      { userId: familyGuest2._id, userName: familyGuest2.name, amount: 25,  type: "custom" },
    ],
    createdBy: emma._id,
  });

  // EUR — vacation souvenir bought abroad
  await addExpense({
    description: "מזכרות מחופשה באירופה — Souvenirs",
    amount: 65, currency: "EUR", date: daysAgo(6),
    groupId: family._id, groupLabel: "Family", splitType: "equal",
    payers: [{ userId: noa._id, userName: noa.name, amount: 65, type: "equal" }],
    splits: eqSplits(familyRegistered, 65),
    createdBy: noa._id,
  });

  // USD — online group purchase
  await addExpense({
    description: "הזמנה מאמזון — Amazon order",
    amount: 120, currency: "USD", date: daysAgo(9),
    groupId: family._id, groupLabel: "Family", splitType: "equal",
    payers: [{ userId: michal._id, userName: michal.name, amount: 120, type: "equal" }],
    splits: eqSplits(allFamily, 120),
    createdBy: michal._id,
  });

  // ────────────── SOLITARY SAM (1 member only) ──────────────

  await addExpense({
    description: "Gym Membership",
    amount: 50, currency: "USD", date: daysAgo(2),
    groupId: samGroup._id, groupLabel: "SamGroup", splitType: "equal",
    payers: [{ userId: sam._id, userName: sam.name, amount: 50, type: "equal" }],
    splits: eqSplits([sam], 50),
    createdBy: sam._id,
  });
  
  await addExpense({
    description: "Coffee",
    amount: 4.5, currency: "USD", date: daysAgo(1),
    groupId: samGroup._id, groupLabel: "SamGroup", splitType: "equal",
    payers: [{ userId: sam._id, userName: sam.name, amount: 4.5, type: "equal" }],
    splits: eqSplits([sam], 4.5),
    createdBy: sam._id,
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const guestCount = 6;
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Seed complete!`);
  console.log(`   ${registeredUsers.length} registered users`);
  console.log(`   ${guestCount} guest users`);
  console.log(`   ${groups.length} groups`);
  console.log(`   ${count} expenses`);
  console.log(`\n   Login with any email below + password: password123`);
  registeredData.forEach((u) => console.log(`     • ${u.email}`));
  console.log(`${"═".repeat(50)}\n`);

  await client.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
