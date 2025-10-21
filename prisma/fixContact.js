const { Prisma } = require('@prisma/client');
const prisma = require('./client');

async function main() {
  const result = await prisma.user.updateMany({
    where: {
        contacts: {
            equals: Prisma.JsonNull, // ✅ phải dùng Prisma.JsonNull
      },
    },
    data: {
      contacts: {
        facebook: "",
        zalo: "" ,
        instagram: "" ,
      },
    },
  });


  console.log(`✅ Updated ${result.count} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });