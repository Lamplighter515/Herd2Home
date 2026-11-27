import { PrismaClient, Species, AnimalStatus, CheckoutMode, PickupType, OrderStatus, PackageStatus } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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
  const hogLot = await prisma.lot.create({
    data: { farmId: hughes.id, name: "Finishing Hogs", species: Species.HOGS },
  });

  const animals = await Promise.all([
    prisma.animal.create({
      data: {
        farmId: hughes.id,
        lotId: northLot.id,
        tag: "C-101",
        species: Species.CATTLE,
        sex: "steer",
        status: AnimalStatus.PASTURE,
        birthOrAcquired: new Date("2024-03-12"),
        notes: "Grass-finished pilot animal",
      },
    }),
    prisma.animal.create({
      data: {
        farmId: hughes.id,
        lotId: northLot.id,
        tag: "C-102",
        species: Species.CATTLE,
        sex: "heifer",
        status: AnimalStatus.BOOKED_AT_LOCKER,
        birthOrAcquired: new Date("2024-04-02"),
        notes: "Booked at Boone County Locker",
      },
    }),
    prisma.animal.create({
      data: {
        farmId: hughes.id,
        lotId: hogLot.id,
        tag: "H-44",
        species: Species.HOGS,
        sex: "barrow",
        status: AnimalStatus.PASTURE,
        birthOrAcquired: new Date("2025-01-18"),
      },
    }),
    prisma.animal.create({
      data: {
        farmId: hughes.id,
        lotId: hogLot.id,
        tag: "H-45",
        species: Species.HOGS,
        sex: "gilt",
        status: AnimalStatus.IN_FREEZER,
        birthOrAcquired: new Date("2025-01-18"),
        notes: "Yield entered; packages in freezer",
      },
    }),
  ]);

  await prisma.lot.create({
    data: { farmId: sugar.id, name: "Creek Bottom Sheep", species: Species.SHEEP },
  });
  await prisma.animal.create({
    data: {
      farmId: sugar.id,
      tag: "S-12",
      species: Species.SHEEP,
      sex: "ewe",
      status: AnimalStatus.PASTURE,
      notes: "Starter ewe for Sugar Creek",
    },
  });
  await prisma.animal.create({
    data: {
      farmId: sugar.id,
      tag: "G-3",
      species: Species.GOATS,
      sex: "wether",
      status: AnimalStatus.PASTURE,
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
      status: AnimalStatus.PASTURE,
      notes: "100-bird PPIA-exempt batch placeholder",
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

  const job = await prisma.processorJob.create({
    data: {
      farmId: hughes.id,
      butcherId: butcher.id,
      scheduledDate: new Date("2026-12-15"),
      status: "booked",
      notes: "C-102 heifer — standard beef cut sheet",
      animals: { create: [{ animalId: animals[1].id }] },
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

  void job;

  const pkgGround = await prisma.freezerPackage.create({
    data: {
      farmId: hughes.id,
      animalId: animals[3].id,
      cutName: "Ground pork",
      weightLbs: 12.4,
      status: PackageStatus.AVAILABLE,
      inspectionPath: CheckoutMode.INSPECTED_RETAIL,
    },
  });
  const pkgChops = await prisma.freezerPackage.create({
    data: {
      farmId: hughes.id,
      animalId: animals[3].id,
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
          { animalId: animals[0].id, name: "Alex Miller", sharePct: 50 },
          { animalId: animals[0].id, name: "Sam Miller", sharePct: 50 },
        ],
      },
    },
  });

  console.log("Seeded 3 Indiana pilot farms. Login: nathan@herd2home.local / pilot1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
