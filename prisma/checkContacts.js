const prisma = require('./client');

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, contacts: true },
  });

  let jsonNullCount = 0;
  let dbNullCount = 0;
  let objectCount = 0;

  users.forEach((u) => {
    if (u.contacts === null) {
      // Đây là trường hợp SQL NULL thực sự → Prisma.JsonNull
      jsonNullCount++;
      console.log(`🟡 User ${u.id}: contacts = SQL NULL (JsonNull)`);
    } else if (u.contacts === 'DbNull') {
      // Ít gặp hơn - literal null trong JSON
      dbNullCount++;
      console.log(`🔵 User ${u.id}: contacts = DbNull`);
    } else {
      objectCount++;
      console.log(`✅ User ${u.id}: contacts = object`, u.contacts);
    }
  });

  console.log("\n=== Tổng kết ===");
  console.log(`JsonNull (SQL NULL): ${jsonNullCount}`);
  console.log(`DbNull (JSON null): ${dbNullCount}`);
  console.log(`Object JSON: ${objectCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
