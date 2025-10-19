const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { Strategy: JWTStrategy, ExtractJwt } = require('passport-jwt');
const bcrypt = require('bcryptjs');
const prisma = require('./prisma/client'); // ✅ Your Prisma client instance

// LocalStrategy - login
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password'}
    , async (email, password, done) => {
        try {
            
            const user = await prisma.user.findUnique({ 
                where: { email },
                include: {
                    staycations: true
                }
            });
            
            if (!user) {
                return done(null, false, { message: 'Email chưa đăng ký' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return done(null, false, { message: 'Sai mật khẩu' });
            }

            return done(null, user); // Login thành công
        } catch (err) {
            return done(err);
        }
}));

// // JWT strategy
// passport.use(new JWTStrategy({
//     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//     secretOrKey: process.env.JWT_SECRET,
// }, async (jwtPayload, done) => {
//     try {
//         const user = await prisma.user.findUnique({ where: { id: jwtPayload.id } });

//         if (!user) {
//             return done(null, false, { message: 'Không tìm thấy user' });
//         }

//         return done(null, user);
//     } catch (err) {
//         return done(err);
//     }
// }));
