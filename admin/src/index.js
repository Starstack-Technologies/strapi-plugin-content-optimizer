import { Sparkle } from "@strapi/icons";
import { SEOScoreWidget } from "./components/SEOScoreWidget/index.jsx";
import { ContentOptimizerInjectedComponent } from "./components/ContentOptimizerInjectedComponent/index.jsx";

const PLUGIN_ID = "content-optimizer";

const prefixPluginTranslations = (trad, pluginId) => {
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {});
};

export default {
  register(app) {
    // Register main plugin page
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Sparkle,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Content Optimizer",
      },
      // Strapi 5 expects: () => import(path) returning { default: Component }
      Component: () =>
        import("./pages/App/index.jsx").then((m) => ({ default: m.App })),
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      name: "Content Optimizer",
    });

    // Inject components into Content Manager
    const cmPlugin = app.getPlugin("content-manager");

    if (cmPlugin && cmPlugin.injectComponent) {
      cmPlugin.injectComponent("editView", "right-links", {
        name: `${PLUGIN_ID}-analysis`,
        Component: ContentOptimizerInjectedComponent,
      });

      cmPlugin.injectComponent("editView", "right-links", {
        name: `${PLUGIN_ID}-seo-widget`,
        Component: SEOScoreWidget,
      });
    }
  },

  async registerTrads({ locales }) {
    const importedTranslations = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, PLUGIN_ID),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      }),
    );

    return importedTranslations;
  },
};
