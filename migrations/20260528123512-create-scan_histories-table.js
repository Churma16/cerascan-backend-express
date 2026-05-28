'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('scan_histories', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            scan_id: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            file_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            saved_file_name: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            prediction: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            confidence: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: false,
            },
            inference_time: {
                type: Sequelize.STRING(20),
                allowNull: false,
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
        await queryInterface.dropTable('scan_histories');
    }
};
