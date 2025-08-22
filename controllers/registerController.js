const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs')
const prisma = require('../prisma/client')
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const axios = require('axios');


exports.userRegister = async (req, res, next) => {
    
    const {firstName, lastName , password, email, isAdmin} = req.body

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name: firstName + " " + lastName,
                password: hashedPassword,
                email: email,
                isAdmin: isAdmin
            }
        })

        const payload = {
            id: user.id,
            name: user.name,
            isAdmin: user.isAdmin, // nếu có
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        return res.json({ user: payload });

    } catch (error) {
        console.error(error);
        next(error);
      }
};

const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
//this is actually login via google. How do i store that user to my db ? 
exports.userRegisterGoogleAuth = async (req, res, next) => {
    const { credential } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.OAUTH_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email },
        });

        // If not, create new user
        if (!user) {
            // Define local avatar path
            const avatarFileName = `${sub}.jpg`;
            const avatarRelativePath = `/avatar/${avatarFileName}`;
            const avatarFullPath = path.join(__dirname, '..', 'assets', 'avatar', avatarFileName);

            // Download and save avatar
            try {
                const response = await axios.get(picture, { responseType: 'arraybuffer' });
                fs.writeFileSync(avatarFullPath, response.data);
            } catch (e) {
                console.error('❌ Failed to download Google avatar:', e.message);
            }

            // Create user with local avatar path
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    isAdmin: false,
                    avatar: avatarRelativePath, // You can prefix this on frontend with your Imgix URL
                },
            });
        }

        const payloadUser = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
        };

        const token = jwt.sign(payloadUser, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.json({ user: payloadUser });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
};




