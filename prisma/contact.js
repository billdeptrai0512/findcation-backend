const prisma = require('./client');

/**
 * Assign contacts from the first staycation of each user
 * to that user, then clear them from the staycation.
 */
async function assignStaycationContactsToUsers() {
  try {
    // 1️⃣ Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
      await assignFirstStaycationContactsToUser(user.id);
    }

    console.log('✅ All user contacts updated.');
  } catch (error) {
    console.error('❌ Failed to assign contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Assign the contacts from a user's first staycation to the user
 * and clear the staycation contacts.
 */
async function assignFirstStaycationContactsToUser(userId) {
  try {
    // Find the first staycation owned by this user
    const firstStaycation = await prisma.staycation.findFirst({
      where: { hostId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, contacts: true },
    });

    if (!firstStaycation) {
      console.log(`⚪ No staycation found for user ${userId}`);
      return;
    }

    const contacts = firstStaycation.contacts;
    if (!contacts || Object.keys(contacts).length === 0) {
      console.log(`⚪ Staycation ${firstStaycation.id} has no contacts.`);
      return;
    }

    // Update user with staycation contacts
    await prisma.user.update({
      where: { id: userId },
      data: { contacts },
    });

    console.log(`✅ Copied contacts from staycation ${firstStaycation.id} → user ${userId}`);

    // Clear contacts from staycation (optional but recommended)
    // await prisma.staycation.update({
    //   where: { id: firstStaycation.id },
    //   data: { contacts: {} },
    // });
  } catch (error) {
    console.error(`❌ Failed to process user ${userId}:`, error.message);
  }
}

// Run the script
assignStaycationContactsToUsers();
