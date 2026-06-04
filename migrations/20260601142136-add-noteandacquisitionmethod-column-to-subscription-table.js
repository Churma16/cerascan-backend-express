'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn('subscriptions', 'note', {
            type: Sequelize.TEXT,
            allowNull: true,
        });

        await queryInterface.addColumn('subscriptions', 'acquisition_method', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'midtrans_payment'
        });
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn('subscriptions', 'note');
        await queryInterface.removeColumn('subscriptions', 'acquisition_method');
    }
};
