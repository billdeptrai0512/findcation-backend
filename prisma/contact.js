const prisma = require('./client')

async function migrateAllUserContacts() {
  try {
    // 🧠 Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      await assignFirstStaycationContactsToUser(user.id);
    }

    console.log(`✅ Migration finished for ${users.length} users`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}


async function assignFirstStaycationContactsToUser(userId) {
  try {
    // 1️⃣ Find the first staycation of this user (by createdAt ascending)
    const firstStaycation = await prisma.staycation.findFirst({
      where: { hostId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, contacts: true },
    });

    if (!firstStaycation) {
      console.log(`No staycations found for user ${userId}`);
      return;
    }

    // 2️⃣ Get contacts from the staycation
    const contacts = firstStaycation.contacts;
    if (!contacts || Object.keys(contacts).length === 0) {
      console.log(`First staycation for user ${userId} has no contacts`);
      return;
    }

    // 3️⃣ Update user.contacts with the staycation contacts
    await prisma.user.update({
      where: { id: userId },
      data: { contacts },
    });

    console.log(`✅ Assigned contacts from staycation ${firstStaycation.id} to user ${userId}`);

    // 4️⃣ (Optional) Clear contacts from the staycation after moving
    await prisma.staycation.update({
      where: { id: firstStaycation.id },
      data: { contacts: {} },
    });

  } catch (error) {
    console.error(`❌ Failed to assign first staycation contacts for user ${userId}:`, error);
  }
}

migrateAllUserContacts()

module.exports = { assignFirstStaycationContactsToUser };
