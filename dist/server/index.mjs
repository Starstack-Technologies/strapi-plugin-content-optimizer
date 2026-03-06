function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var register$1 = ({ strapi }) => {
};
var bootstrap$1 = ({ strapi }) => {
};
var destroy$1 = ({ strapi }) => {
};
var config$1 = {
  default: {},
  validator() {
  }
};
var myController$1 = ({ strapi }) => ({
  async index(ctx) {
    ctx.body = {
      message: "Welcome to Content Optimizer plugin!"
    };
  }
});
const myController = myController$1;
var controllers$1 = {
  myController
};
var routes$1 = [
  {
    method: "GET",
    path: "/",
    handler: "myController.index",
    config: {
      policies: [],
      auth: false
    }
  }
];
var myService$1 = ({ strapi }) => ({
  async getWelcomeMessage() {
    return "Welcome to Content Optimizer!";
  }
});
const myService = myService$1;
var services$1 = {
  myService
};
var middlewares$1 = {};
var policies$1 = {};
const register = register$1;
const bootstrap = bootstrap$1;
const destroy = destroy$1;
const config = config$1;
const controllers = controllers$1;
const routes = routes$1;
const services = services$1;
const middlewares = middlewares$1;
const policies = policies$1;
var server = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  middlewares,
  policies
};
const index = /* @__PURE__ */ getDefaultExportFromCjs(server);
export {
  index as default
};
