import {
  PrismaClient,
  Species,
  AnimalStatus,
  AnimalSex,
  AnimalClass,
  CheckoutMode,
  PickupType,
  OrderStatus,
  PackageStatus,
  SalePath,
  SharePortion,
  WeightEventType,
  WeightSource,
  HealthEventType,
  BreedingMethod,
  PregnancyStatus,
  CostCategory,
  CostAllocationMethod,
} from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.costAllocation.deleteMany();
  await prisma.costEntry.deleteMany();
  await prisma.animalShareSlot.deleteMany();
  await prisma.pregnancy.deleteMany();
  await prisma.breedingEvent.deleteMany();
  await prisma.healthEvent.deleteMany();
  await prisma.weightEvent.deleteMany();
  await prisma.animalStatusHistory.deleteMany();
  await prisma.medicineProduct.deleteMany();
  await prisma.shareOwner.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.buyerOrder.deleteMany();
  await prisma.freezerPackage.deleteMany();
  await prisma.cutSheet.deleteMany();
  await prisma.processorJobAnimal.deleteMany();
  await prisma.processorJob.deleteMany();
  await prisma.butcherPriceItem.deleteMany();
  await prisma.butcher.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.farmMembership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = hashSync("pilot1234", 10);
  const nathan = await prisma.user.create({
    data: {
      email: "nathan@herd2home.local",
      name: "Nathan Hughes",
      passwordHash,
    },
  });

  const farms = await Promise.all([
    prisma.farm.create({
      data: {
        name: "Hughes Family Farm",
        city: "Lebanon",
        county: "Boone",
        state: "IN",
      },
    }),
    prisma.farm.create({
      data: {
        name: "Sugar Creek Livestock",
        city: "Crawfordsville",
        county: "Montgomery",
        state: "IN",
      },
    }),
    prisma.farm.create({
      data: {
        name: "White River Pastures",
        city: "Martinsville",
        county: "Morgan",
        state: "IN",
      },
    }),
  ]);

  for (const farm of farms) {
    await prisma.farmMembership.create({
      data: { userId: nathan.id, farmId: farm.id, role: "owner" },
    });
  }

  const [hughes, sugar, white] = farms;

  const northLot = await prisma.lot.create({
    data: { farmId: hughes.id, name: "North Pasture Cattle", species: Species.CATTLE },
  });
  const finishLot = await prisma.lot.create({
    data: { farmId: hughes.id, name: "Finishing pen", species: Species.CATTLE },
  });
  const hogLot = await prisma.lot.create({
    data: { farmId: hughes.id, name: "Finishing Hogs", species: Species.HOGS },
  });

  const ivomec = await prisma.medicineProduct.create({
    data: {
      farmId: hughes.id,
      name: "Ivomec (demo)",
      defaultMeatWithdrawalDays: 35,
      notes: "Seed catalog product for withdrawal demos",
    },
  });

  const bull = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: northLot.id,
      tag: "C-80",
      name: "Red",
      eid: "840003212345678",
      species: Species.CATTLE,
      sex: "bull",
      sexEnum: AnimalSex.MALE,
      animalClass: AnimalClass.BULL,
      breed: "Angus",
      colorMarkings: "Black",
      status: AnimalStatus.ON_FARM,
      birthOrAcquired: new Date("2022-05-01"),
      purchasePriceCents: 280000,
      notes: "Herd bull",
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });

  const cow = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: northLot.id,
      tag: "C-90",
      name: "Daisy",
      eid: "840003212345679",
      species: Species.CATTLE,
      sex: "cow",
      sexEnum: AnimalSex.FEMALE,
      animalClass: AnimalClass.COW,
      breed: "Angus cross",
      status: AnimalStatus.ON_FARM,
      birthOrAcquired: new Date("2021-03-20"),
      purchasePriceCents: 150000,
      notes: "Brood cow — confirmed pregnant",
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });

  const heifer = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: northLot.id,
      tag: "C-102",
      name: "Bella",
      eid: "840003212345680",
      species: Species.CATTLE,
      sex: "heifer",
      sexEnum: AnimalSex.FEMALE,
      animalClass: AnimalClass.HEIFER,
      breed: "Hereford cross",
      status: AnimalStatus.BOOKED_LOCKER,
      birthOrAcquired: new Date("2024-04-02"),
      purchasePriceCents: 120000,
      notes: "Booked at Boone County Locker — inspected path",
      availableForSale: true,
      salePath: SalePath.INSPECTED_RETAIL,
      listedAt: new Date("2026-10-01"),
      targetReadyDate: new Date("2026-12-20"),
      publicBlurb: "Grass-finished heifer — retail packages after hang",
      statusHistory: {
        create: [
          { toStatus: AnimalStatus.ON_FARM, changedAt: new Date("2024-04-02"), notes: "Born/acquired" },
          {
            fromStatus: AnimalStatus.ON_FARM,
            toStatus: AnimalStatus.BOOKED_LOCKER,
            changedAt: new Date("2026-11-01"),
            notes: "Booked locker week of Dec 15",
          },
        ],
      },
    },
  });

  const steer = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: finishLot.id,
      tag: "C-101",
      name: "Tank",
      eid: "840003212345681",
      species: Species.CATTLE,
      sex: "steer",
      sexEnum: AnimalSex.CASTRATE,
      animalClass: AnimalClass.STEER,
      breed: "Angus",
      colorMarkings: "Black with white face",
      status: AnimalStatus.RESERVED_SHARE,
      birthOrAcquired: new Date("2024-03-12"),
      purchasePriceCents: 95000,
      notes: "Custom-exempt share animal — rostered",
      availableForSale: true,
      salePath: SalePath.CUSTOM_EXEMPT_SHARE,
      listedAt: new Date("2026-09-15"),
      targetReadyDate: new Date("2027-01-10"),
      sharePortion: SharePortion.HALF,
      shareSlots: 2,
      publicBlurb: "Half-share grass beef — owners named before kill date",
      statusHistory: {
        create: [
          { toStatus: AnimalStatus.ON_FARM, changedAt: new Date("2024-03-12"), notes: "Seeded" },
          {
            fromStatus: AnimalStatus.ON_FARM,
            toStatus: AnimalStatus.RESERVED_SHARE,
            changedAt: new Date("2026-09-20"),
            notes: "Share buyers rostered",
          },
        ],
      },
    },
  });

  const treatedSteer = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: finishLot.id,
      tag: "C-110",
      species: Species.CATTLE,
      sex: "steer",
      sexEnum: AnimalSex.CASTRATE,
      animalClass: AnimalClass.STEER,
      status: AnimalStatus.ON_FARM,
      birthOrAcquired: new Date("2024-06-01"),
      purchasePriceCents: 87500,
      notes: "In meat withdrawal — sale/process blocked",
      availableForSale: false,
      salePath: SalePath.NONE,
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });

  const hogBarrow = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: hogLot.id,
      tag: "H-44",
      species: Species.HOGS,
      sex: "barrow",
      sexEnum: AnimalSex.CASTRATE,
      animalClass: AnimalClass.BARROW,
      status: AnimalStatus.ON_FARM,
      birthOrAcquired: new Date("2025-01-18"),
      purchasePriceCents: 12000,
      availableForSale: true,
      salePath: SalePath.INSPECTED_RETAIL,
      listedAt: new Date("2026-11-01"),
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });

  const hogInFreezer = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: hogLot.id,
      tag: "H-45",
      species: Species.HOGS,
      sex: "gilt",
      sexEnum: AnimalSex.FEMALE,
      animalClass: AnimalClass.GILT,
      status: AnimalStatus.IN_FREEZER,
      birthOrAcquired: new Date("2025-01-18"),
      notes: "Yield entered; packages in freezer",
      availableForSale: true,
      salePath: SalePath.INSPECTED_RETAIL,
      listedAt: new Date("2026-08-01"),
      statusHistory: {
        create: [
          { toStatus: AnimalStatus.ON_FARM, changedAt: new Date("2025-01-18") },
          {
            fromStatus: AnimalStatus.ON_FARM,
            toStatus: AnimalStatus.HANGING,
            changedAt: new Date("2026-08-10"),
          },
          {
            fromStatus: AnimalStatus.HANGING,
            toStatus: AnimalStatus.IN_FREEZER,
            changedAt: new Date("2026-08-20"),
            notes: "Packages created",
          },
        ],
      },
    },
  });

  // Weights
  await prisma.weightEvent.createMany({
    data: [
      {
        animalId: steer.id,
        weighedAt: new Date("2024-03-12"),
        weightLb: 85,
        type: WeightEventType.BIRTH,
        source: WeightSource.SCALE,
      },
      {
        animalId: steer.id,
        weighedAt: new Date("2024-09-01"),
        weightLb: 520,
        type: WeightEventType.WEAN,
        source: WeightSource.SCALE,
      },
      {
        animalId: steer.id,
        weighedAt: new Date("2026-10-15"),
        weightLb: 1180,
        type: WeightEventType.PERIODIC,
        source: WeightSource.SCALE,
        notes: "Pre-share weigh",
      },
      {
        animalId: heifer.id,
        weighedAt: new Date("2026-10-20"),
        weightLb: 1050,
        type: WeightEventType.PERIODIC,
        source: WeightSource.SCALE,
      },
      {
        animalId: hogInFreezer.id,
        weighedAt: new Date("2026-08-12"),
        weightLb: 210,
        type: WeightEventType.HANGING,
        source: WeightSource.PLANT,
        notes: "Mirrored from processor job",
      },
    ],
  });

  // Health / withdrawal
  await prisma.healthEvent.createMany({
    data: [
      {
        animalId: treatedSteer.id,
        eventAt: new Date("2026-11-10"),
        type: HealthEventType.TREATMENT,
        productName: "Ivomec",
        medicineProductId: ivomec.id,
        dose: "1 ml / 110 lb",
        route: "SQ",
        administeredBy: "Nathan",
        meatWithdrawalEndsAt: new Date("2026-12-15"),
        notes: "Demo active withdrawal through mid-December",
      },
      {
        animalId: cow.id,
        eventAt: new Date("2026-04-01"),
        type: HealthEventType.VACCINE,
        productName: "CattleMaster Gold",
        dose: "2 ml",
        route: "IM",
        administeredBy: "Nathan",
        meatWithdrawalEndsAt: new Date("2026-04-22"),
        notes: "Withdrawal cleared",
      },
      {
        animalId: steer.id,
        eventAt: new Date("2026-05-01"),
        type: HealthEventType.VET_VISIT,
        vetName: "Dr. Patel",
        notes: "BCS check — ready for finishing",
      },
    ],
  });

  // Breeding + pregnancy
  const breeding = await prisma.breedingEvent.create({
    data: {
      femaleId: cow.id,
      method: BreedingMethod.NATURAL,
      sireId: bull.id,
      exposureStart: new Date("2026-03-01"),
      exposureEnd: new Date("2026-03-20"),
      notes: "Turnout with Red",
    },
  });
  await prisma.pregnancy.create({
    data: {
      femaleId: cow.id,
      breedingEventId: breeding.id,
      status: PregnancyStatus.CONFIRMED,
      breedDate: new Date("2026-03-10"),
      dueDate: new Date("2026-12-18"),
      checkDate: new Date("2026-05-15"),
      checkResult: "Bred — ultrasound positive",
    },
  });

  const heiferBreeding = await prisma.breedingEvent.create({
    data: {
      femaleId: heifer.id,
      method: BreedingMethod.AI,
      sireName: "AI stud ABS 29AN2280",
      aiDate: new Date("2026-06-01"),
      notes: "Did not hold — booked for locker instead",
    },
  });
  await prisma.pregnancy.create({
    data: {
      femaleId: heifer.id,
      breedingEventId: heiferBreeding.id,
      status: PregnancyStatus.OPEN_AFTER_CHECK,
      breedDate: new Date("2026-06-01"),
      dueDate: new Date("2027-03-11"),
      checkDate: new Date("2026-08-01"),
      checkResult: "Open",
    },
  });

  // Calf with sex + sire at birth
  const calf = await prisma.animal.create({
    data: {
      farmId: hughes.id,
      lotId: northLot.id,
      tag: "C-201",
      species: Species.CATTLE,
      sex: "heifer",
      sexEnum: AnimalSex.FEMALE,
      animalClass: AnimalClass.HEIFER,
      status: AnimalStatus.ON_FARM,
      birthOrAcquired: new Date("2026-02-14"),
      damId: cow.id,
      sireId: bull.id,
      sireName: "Red",
      notes: "2026 calf — sex + sire recorded at birth",
      statusHistory: {
        create: { toStatus: AnimalStatus.ON_FARM, notes: "Born to C-90" },
      },
    },
  });
  await prisma.weightEvent.create({
    data: {
      animalId: calf.id,
      weighedAt: new Date("2026-02-14"),
      weightLb: 78,
      type: WeightEventType.BIRTH,
      source: WeightSource.SCALE,
    },
  });

  // Custom-exempt share roster on steer
  await prisma.animalShareSlot.createMany({
    data: [
      {
        animalId: steer.id,
        ownerName: "Alex Miller",
        portion: SharePortion.HALF,
        phone: "317-555-0100",
        email: "alex@example.com",
      },
      {
        animalId: steer.id,
        ownerName: "Sam Miller",
        portion: SharePortion.HALF,
        phone: "317-555-0101",
      },
    ],
  });

  await prisma.lot.create({
    data: { farmId: sugar.id, name: "Creek Bottom Sheep", species: Species.SHEEP },
  });
  await prisma.animal.create({
    data: {
      farmId: sugar.id,
      tag: "S-12",
      species: Species.SHEEP,
      sex: "ewe",
      sexEnum: AnimalSex.FEMALE,
      animalClass: AnimalClass.EWE,
      status: AnimalStatus.ON_FARM,
      notes: "Starter ewe for Sugar Creek",
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });
  await prisma.animal.create({
    data: {
      farmId: sugar.id,
      tag: "G-3",
      species: Species.GOATS,
      sex: "wether",
      sexEnum: AnimalSex.CASTRATE,
      animalClass: AnimalClass.WETHER,
      status: AnimalStatus.ON_FARM,
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });

  await prisma.lot.create({
    data: { farmId: white.id, name: "Pasture Broilers", species: Species.POULTRY },
  });
  await prisma.animal.create({
    data: {
      farmId: white.id,
      tag: "P-batch-01",
      species: Species.POULTRY,
      sex: "mixed",
      sexEnum: AnimalSex.UNKNOWN,
      animalClass: AnimalClass.OTHER,
      status: AnimalStatus.ON_FARM,
      notes: "100-bird PPIA-exempt batch placeholder",
      statusHistory: { create: { toStatus: AnimalStatus.ON_FARM, notes: "Seeded" } },
    },
  });

  const butcher = await prisma.butcher.create({
    data: {
      farmId: hughes.id,
      name: "Boone County Locker",
      city: "Lebanon",
      state: "IN",
      phone: "765-555-0142",
      notes: "Pilot butcher — basic pricing only",
      prices: {
        create: [
          { label: "Slaughter + cut (cattle)", unit: "head", priceCents: 45000 },
          { label: "Slaughter + cut (hogs)", unit: "head", priceCents: 18000 },
          { label: "Vacuum pack", unit: "lb", priceCents: 75 },
          { label: "Grind", unit: "lb", priceCents: 55 },
        ],
      },
    },
  });

  await prisma.butcher.create({
    data: {
      farmId: sugar.id,
      name: "Sugar Creek Meat Co.",
      city: "Crawfordsville",
      state: "IN",
      phone: "765-555-0198",
      prices: {
        create: [
          { label: "Custom processing", unit: "head", priceCents: 20000 },
          { label: "Cut & wrap", unit: "lb", priceCents: 90 },
        ],
      },
    },
  });

  await prisma.processorJob.create({
    data: {
      farmId: hughes.id,
      butcherId: butcher.id,
      scheduledDate: new Date("2026-12-15"),
      status: "booked",
      notes: "C-102 heifer — standard beef cut sheet",
      animals: { create: [{ animalId: heifer.id }] },
      cutSheet: {
        create: {
          species: Species.CATTLE,
          templateJson: JSON.stringify({
            steaks: "1.25 in",
            roasts: "3-4 lb",
            ground: "1 lb packs",
            organs: "keep liver",
          }),
          notes: "Thin stub cut sheet",
        },
      },
    },
  });

  const pkgGround = await prisma.freezerPackage.create({
    data: {
      farmId: hughes.id,
      animalId: hogInFreezer.id,
      cutName: "Ground pork",
      weightLbs: 12.4,
      status: PackageStatus.AVAILABLE,
      inspectionPath: CheckoutMode.INSPECTED_RETAIL,
    },
  });
  const pkgChops = await prisma.freezerPackage.create({
    data: {
      farmId: hughes.id,
      animalId: hogInFreezer.id,
      cutName: "Pork chops",
      weightLbs: 8.2,
      status: PackageStatus.AVAILABLE,
      inspectionPath: CheckoutMode.INSPECTED_RETAIL,
    },
  });

  await prisma.buyerOrder.create({
    data: {
      farmId: hughes.id,
      butcherId: butcher.id,
      buyerName: "Jordan Lee",
      buyerEmail: "jordan@example.com",
      checkoutMode: CheckoutMode.INSPECTED_RETAIL,
      pickupType: PickupType.FARM,
      status: OrderStatus.RESERVED,
      stripePaymentIntentId: "pi_stub_demo_001",
      notes: "Farm pickup Saturday — Stripe stub only",
      items: {
        create: [
          { packageId: pkgGround.id, label: "Ground pork 12.4 lb", quantity: 1 },
          { packageId: pkgChops.id, label: "Pork chops 8.2 lb", quantity: 1 },
        ],
      },
    },
  });

  await prisma.buyerOrder.create({
    data: {
      farmId: hughes.id,
      butcherId: butcher.id,
      buyerName: "Share roster: Miller family",
      buyerPhone: "317-555-0100",
      checkoutMode: CheckoutMode.CUSTOM_EXEMPT_SHARE,
      pickupType: PickupType.BUTCHER,
      status: OrderStatus.DRAFT,
      stripePaymentIntentId: null,
      notes: "Custom-exempt live share — owner roster before slaughter",
      shareOwners: {
        create: [
          { animalId: steer.id, name: "Alex Miller", sharePct: 50 },
          { animalId: steer.id, name: "Sam Miller", sharePct: 50 },
        ],
      },
    },
  });

  // Cost ledger — hay on north pasture (equal per head) + finishing feed (weight-gain stub equal fallback)
  const northAnimals = [bull, cow, heifer];
  const hayTotal = 36000; // $360
  const hayEach = Math.floor(hayTotal / northAnimals.length);
  const hayLines = northAnimals.map((a, i) => ({
    animalId: a.id,
    amountCents: hayEach + (i < hayTotal - hayEach * northAnimals.length ? 1 : 0),
    shareRatio: 1 / northAnimals.length,
  }));
  await prisma.costEntry.create({
    data: {
      farmId: hughes.id,
      lotId: northLot.id,
      category: CostCategory.HAY,
      amountCents: hayTotal,
      incurredAt: new Date("2026-11-01"),
      periodStart: new Date("2026-10-01"),
      periodEnd: new Date("2026-10-31"),
      description: "Round bales — North Pasture October",
      allocationMethod: CostAllocationMethod.EQUAL_PER_HEAD,
      allocations: { create: hayLines },
    },
  });

  const finishAnimals = [steer, treatedSteer];
  const feedTotal = 48000; // $480
  const feedEach = feedTotal / finishAnimals.length;
  await prisma.costEntry.create({
    data: {
      farmId: hughes.id,
      lotId: finishLot.id,
      category: CostCategory.FEED,
      amountCents: feedTotal,
      incurredAt: new Date("2026-11-15"),
      periodStart: new Date("2026-10-01"),
      periodEnd: new Date("2026-11-15"),
      description: "Finishing ration — November",
      allocationMethod: CostAllocationMethod.EQUAL_PER_HEAD,
      allocations: {
        create: finishAnimals.map((a) => ({
          animalId: a.id,
          amountCents: feedEach,
          shareRatio: 1 / finishAnimals.length,
        })),
      },
    },
  });

  void hogBarrow;

  console.log("Seeded herd v1.1 + cost demo data. Login: nathan@herd2home.local / pilot1234");
  console.log("Demo animals: C-101 share roster, C-102 booked retail, C-110 in withdrawal, C-90 pregnant, C-201 calf");
  console.log("Costs: North Pasture hay + finishing feed allocated equal per head");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
