'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction(t => {
            return Promise.all([
                queryInterface.changeColumn('users', 'password', {
                    type: Sequelize.STRING,
                    allowNull: true,
                }, {transaction: t}),

                queryInterface.addColumn('users', 'googleId', {
                    type: Sequelize.STRING,
                    allowNull: true,
                    unique: true,
                }, {transaction: t}),

                queryInterface.addColumn('users', 'avatar', {
                    type: Sequelize.STRING,
                    allowNull: true,
                }, {transaction: t})
            ]);
        });
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction(t => {
            return Promise.all([
                queryInterface.removeColumn('users', 'avatar', {transaction: t}),

                queryInterface.removeColumn('users', 'googleId', {transaction: t}),

                queryInterface.changeColumn('users', 'password', {
                    type: Sequelize.STRING,
                    allowNull: false,
                }, {transaction: t})
            ]);
        });
    }
};