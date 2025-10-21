const prisma = require('./client');

async function main() {
  // 1️⃣ Get all users that have contacts (not null)
  const users = await prisma.user.findMany({
    where: {
      contacts: {
        not: null,
      },
    },
  });

  console.log(`🔍 Found ${users.length} users with contacts`);

  let updatedCount = 0;

  // 2️⃣ Loop and convert each user's contacts
  for (const user of users) {
    const c = user.contacts;

    // Skip users with already-converted format
    if (typeof c?.facebook === 'string') continue;

    // Build new format
    const newContacts = {
      facebook: c?.facebook?.url || "",
      zalo: c?.zalo?.url || "",
      instagram: c?.instagram?.url || "",
    };

    // Update database
    await prisma.user.update({
      where: { id: user.id },
      data: { contacts: newContacts },
    });

    updatedCount++;
  }

  console.log(`✅ Updated ${updatedCount} users`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
