export function seedDemoData() {
  return {
    message: "Demo seeding will move into Prisma once the database layer is connected.",
  };
}

if (require.main === module) {
  console.log(seedDemoData());
}
