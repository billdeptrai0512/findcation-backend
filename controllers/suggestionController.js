const prisma = require('../prisma/client')

exports.allSuggestion = async (req, res, next) => {
  try {
    const allSuggestion = await prisma.suggestion.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    console.log("number suggestions: " + allSuggestion.length)

    res.status(200).json(allSuggestion);
  } catch (error) {
    next(error); // let your error middleware handle it
  }
};

exports.newSuggestion = async (req, res, next) => {
  try {
    const { message, stage, user } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Nếu có user và có id → dùng nó, nếu không thì null
    const userId = user?.id ?? null;

    const newSuggestion = await prisma.suggestion.create({
      data: {
        message,
        stage,
        ...(userId && {   // chỉ connect khi có userId
          user: {
            connect: { id: userId }
          }
        })
      }
    });

    res.status(201).json(newSuggestion);
  } catch (error) {
    next(error);
  }
};
