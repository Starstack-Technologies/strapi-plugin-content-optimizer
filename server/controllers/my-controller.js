'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    ctx.body = {
      message: 'Welcome to Content Optimizer plugin!',
    };
  },
});
