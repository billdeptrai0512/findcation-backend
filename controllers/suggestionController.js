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

        const userId = user.id;

        if (!message || !userId) {
          return res.status(400).json({ error: "Missing message or user" });
        }

        const newSuggestion = await prisma.suggestion.create({
            data: {
                message,
                stage,
                userId
            }
        });

        console.log(newSuggestion)

        res.status(201).json(newSuggestion);
    } catch (error) {
        next(error);
    }
  };