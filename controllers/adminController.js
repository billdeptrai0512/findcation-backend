const prisma = require('../prisma/client');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Helper: normalise a single platform value from the DB
// Old format: contacts.facebook = "billdeptrai0512"  (plain string)
// New format: contacts.facebook = { url, verify, code, codeExpiresAt }
// ---------------------------------------------------------------------------
function normaliseContact(value) {
    if (!value || typeof value === 'object') return value ?? {};
    // Flat string — upgrade to object shell, preserving the url
    return { url: value, verify: false, code: null, codeExpiresAt: null };
}

// ---------------------------------------------------------------------------
// PATCH /admin/host/:id/verify-contact
// Body: { platform: "facebook", verified: true }
// Admin only (jwtAuth + isAdmin)
// ---------------------------------------------------------------------------
exports.verifyContact = async (req, res, next) => {
    const hostId = parseInt(req.params.id, 10);
    const { platform, verified } = req.body;

    if (!platform) {
        return res.status(400).json({ message: 'platform is required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: hostId },
            select: { contacts: true },
        });

        if (!user) return res.status(404).json({ message: 'Host not found' });

        const currentContacts = user.contacts ?? {};
        const platformData = normaliseContact(currentContacts[platform]);

        const updatedPlatform = {
            ...platformData,
            verify: verified ?? true,
            code: null,
            codeExpiresAt: null,
        };

        const updatedContacts = {
            ...currentContacts,
            [platform]: updatedPlatform,
        };

        const updatedUser = await prisma.user.update({
            where: { id: hostId },
            data: { contacts: updatedContacts },
            select: { id: true, contacts: true },
        });

        return res.json({
            message: `${platform} contact verified successfully`,
            contacts: updatedUser.contacts,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// PATCH /admin/staycation/:id/verify-address
// Body: { verified: true }
// Admin only (jwtAuth + isAdmin)
// ---------------------------------------------------------------------------
exports.verifyAddress = async (req, res, next) => {
    const staycationId = parseInt(req.params.id, 10);
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
        return res.status(400).json({ message: 'verified (boolean) is required' });
    }

    try {
        const staycation = await prisma.staycation.findUnique({
            where: { id: staycationId },
            select: { id: true },
        });

        if (!staycation) return res.status(404).json({ message: 'Staycation not found' });

        const updated = await prisma.staycation.update({
            where: { id: staycationId },
            data: { verify: verified },
            select: { id: true, name: true, verify: true },
        });

        return res.json({
            message: `Staycation address ${verified ? 'verified' : 'unverified'} successfully`,
            staycation: updated,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// PATCH /admin/staycation/:id/verify-active
// Body: { active: true | false }
// Admin only (jwtAuth + isAdmin)
// ---------------------------------------------------------------------------
exports.verifyActive = async (req, res, next) => {
    const staycationId = parseInt(req.params.id, 10);
    const { active } = req.body;

    if (typeof active !== 'boolean') {
        return res.status(400).json({ message: 'active (boolean) is required' });
    }

    try {
        const staycation = await prisma.staycation.findUnique({
            where: { id: staycationId },
            select: { id: true },
        });

        if (!staycation) return res.status(404).json({ message: 'Staycation not found' });

        const updated = await prisma.staycation.update({
            where: { id: staycationId },
            data: { active },
            select: { id: true, name: true, active: true },
        });

        return res.json({
            message: `Staycation ${active ? 'activated' : 'deactivated'} successfully`,
            staycation: updated,
        });
    } catch (error) {
        next(error);
    }
};


// ---------------------------------------------------------------------------
// POST /auth/host/:id/generate-code
// Body:  { platform: "facebook" }
// Response: { code: "XK7F2A", expiresAt: "..." }
// Host authenticated — must own the hostId (jwtAuth only, no isAdmin)
// ---------------------------------------------------------------------------
exports.generateCode = async (req, res, next) => {
    const hostId = parseInt(req.params.id, 10);
    const { platform } = req.body;

    if (!platform) {
        return res.status(400).json({ message: 'platform is required' });
    }

    // Host must own this account
    if (req.user.id !== hostId) {
        return res.status(403).json({ message: 'You can only generate codes for your own account' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: hostId },
            select: { contacts: true },
        });

        if (!user) return res.status(404).json({ message: 'Host not found' });

        // Generate 6-char uppercase alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        const currentContacts = user.contacts ?? {};
        const platformData = normaliseContact(currentContacts[platform]);

        const updatedPlatform = {
            ...platformData,
            verify: false,
            code,
            codeExpiresAt: expiresAt.toISOString(),
        };

        await prisma.user.update({
            where: { id: hostId },
            data: {
                contacts: {
                    ...currentContacts,
                    [platform]: updatedPlatform,
                },
            },
        });

        return res.json({ code, expiresAt: expiresAt.toISOString() });
    } catch (error) {
        next(error);
    }
};
