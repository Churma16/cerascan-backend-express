'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('plans', [
            {
                name: 'Free',
                price: 0,
                scan_quota: 100,
                duration_days: 30,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Premium',
                price: 99.99,
                scan_quota: 5000,
                duration_days: 30,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Ultra',
                price: 299.99,
                scan_quota: -1, // unlimited
                duration_days: 30,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('plans', null, {});
    }
};

