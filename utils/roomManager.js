// utils/roomManager.js
async function syncRooms(prisma, staycation, type, numberOfRoom) {
  if (type === "house") {
    // remove all rooms
    await prisma.room.deleteMany({ where: { staycationId: staycation.id } });
    return 0;
  }

  if (type === "room") {
    const currentRooms = staycation.rooms;

    if (numberOfRoom > currentRooms.length) {
      const roomsToCreate = Array.from({
        length: numberOfRoom - currentRooms.length,
      }).map((_, idx) => ({
        name: `Room ${currentRooms.length + idx + 1}`,
        staycationId: staycation.id,
      }));
      await prisma.room.createMany({ data: roomsToCreate });
    } else if (numberOfRoom < currentRooms.length) {
      const roomsToDelete = currentRooms
        .slice(numberOfRoom)
        .map((r) => r.id);
      await prisma.room.deleteMany({ where: { id: { in: roomsToDelete } } });
    }

    return numberOfRoom;
  }

  return staycation.numberOfRoom;
}


module.exports = { syncRooms };
