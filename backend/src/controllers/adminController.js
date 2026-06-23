const prisma = require('../lib/prisma');

// Obtener todas las verificaciones para el panel de control
const getDashboardStats = async (req, res) => {
    try {
        // Obtenemos el total de verificaciones y los riesgos detectados
        const totalVerifications = await prisma.verification.count();
        const highRiskCases = await prisma.riskAssessment.count({
            where: { riskLevel: 'HIGH' }
        });

        // Add counts for APPROVED, REVIEW, REJECTED
        const approved = await prisma.verification.count({ where: { status: 'APPROVED' } });
        const review   = await prisma.verification.count({ where: { status: 'REVIEW' } });
        const rejected = await prisma.verification.count({ where: { status: 'REJECTED' } });

        res.status(200).json({
            summary: {
                total: totalVerifications,
                alerts: highRiskCases,
                approved,
                review,
                rejected
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener estadísticas de administración" });
    }
};

module.exports = { getDashboardStats };