'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('scan_histories', 'user_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        await queryInterface.addConstraint('scan_histories', {
            fields: ['user_id'],
            type: 'foreign key',
            name: 'scan_histories_user_id_fk',
            references: {
                table: 'users',
                field: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeConstraint('scan_histories', 'scan_histories_user_id_fk');

    }
};