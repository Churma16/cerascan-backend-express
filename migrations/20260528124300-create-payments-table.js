'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('payments', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            plan_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'plans',
                    key: 'id',
                },
                onDelete: 'RESTRICT',
            },
            order_id: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            transaction_id: {
                type: Sequelize.STRING(100),
                allowNull: true,
                unique: true,
            },
            amount: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            payment_type: {
                type: Sequelize.STRING(50),
                allowNull: true,
                comment: 'qris, bank_transfer, gopay, dll',
            },
            status: {
                type: Sequelize.ENUM('pending', 'settlement', 'expire', 'deny'),
                allowNull: false,
                defaultValue: 'pending',
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW'),
            },
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('payments');
    }
};

