'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addIndex('leaderboard_archives', ['user_id', 'period'], {
            unique: true,
            name: 'leaderboard_archives_user_id_period_unique'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('leaderboard_archives', 'leaderboard_archives_user_id_period_unique');
    }
};
