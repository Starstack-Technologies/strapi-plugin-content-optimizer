import { jsxs, jsx } from "react/jsx-runtime";
import * as React from "react";
import { R, T, I, y as yl } from "./index-BuWa3cZT.mjs";
import { Layouts, Page } from "@strapi/strapi/admin";
/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
var Action;
(function(Action2) {
  Action2["Pop"] = "POP";
  Action2["Push"] = "PUSH";
  Action2["Replace"] = "REPLACE";
})(Action || (Action = {}));
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined") console.warn(message);
    try {
      throw new Error(message);
    } catch (e) {
    }
  }
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substr(hashIndex);
      path = path.substr(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substr(searchIndex);
      path = path.substr(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
var ResultType;
(function(ResultType2) {
  ResultType2["data"] = "data";
  ResultType2["deferred"] = "deferred";
  ResultType2["redirect"] = "redirect";
  ResultType2["error"] = "error";
})(ResultType || (ResultType = {}));
function matchRoutes(routes, locationArg, basename) {
  if (basename === void 0) {
    basename = "/";
  }
  return matchRoutesImpl(routes, locationArg, basename);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname);
    matches = matchRouteBranch(branches[i], decoded);
  }
  return matches;
}
function flattenRoutes(routes, branches, parentsMeta, parentPath) {
  if (branches === void 0) {
    branches = [];
  }
  if (parentsMeta === void 0) {
    parentsMeta = [];
  }
  if (parentPath === void 0) {
    parentPath = "";
  }
  let flattenRoute = (route, index, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      invariant(meta.relativePath.startsWith(parentPath), 'Absolute route path "' + meta.relativePath + '" nested under path ' + ('"' + parentPath + '" is not valid. An absolute child route path ') + "must start with the combined path of all its parent routes.");
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        "Index routes must not have child routes. Please remove " + ('all child routes from route path "' + path + '".')
      );
      flattenRoutes(route.children, branches, routesMeta, path);
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index) => {
    var _route$path;
    if (route.path === "" || !((_route$path = route.path) != null && _route$path.includes("?"))) {
      flattenRoute(route, index);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0) return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(...restExploded.map((subpath) => subpath === "" ? required : [required, subpath].join("/")));
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map((exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded);
}
function rankRouteBranches(branches) {
  branches.sort((a, b) => a.score !== b.score ? b.score - a.score : compareIndexes(a.routesMeta.map((meta) => meta.childrenIndex), b.routesMeta.map((meta) => meta.childrenIndex)));
}
const paramRe = /^:[\w-]+$/;
const dynamicSegmentValue = 3;
const indexRouteValue = 2;
const emptySegmentValue = 1;
const staticSegmentValue = 10;
const splatPenalty = -2;
const isSplat = (s) => s === "*";
function computeScore(path, index) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s) => !isSplat(s)).reduce((score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue), initialScore);
}
function compareIndexes(a, b) {
  let siblings = a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a[a.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial) {
  let {
    routesMeta
  } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i];
    let end = i === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath({
      path: meta.relativePath,
      caseSensitive: meta.caseSensitive,
      end
    }, remainingPathname);
    let route = meta.route;
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(joinPaths([matchedPathname, match.pathnameBase])),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = {
      path: pattern,
      caseSensitive: false,
      end: true
    };
  }
  let [matcher, compiledParams] = compilePath(pattern.path, pattern.caseSensitive, pattern.end);
  let match = pathname.match(matcher);
  if (!match) return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce((memo, _ref, index) => {
    let {
      paramName,
      isOptional
    } = _ref;
    if (paramName === "*") {
      let splatValue = captureGroups[index] || "";
      pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
    }
    const value = captureGroups[index];
    if (isOptional && !value) {
      memo[paramName] = void 0;
    } else {
      memo[paramName] = (value || "").replace(/%2F/g, "/");
    }
    return memo;
  }, {});
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive, end) {
  if (caseSensitive === void 0) {
    caseSensitive = false;
  }
  if (end === void 0) {
    end = true;
  }
  warning(path === "*" || !path.endsWith("*") || path.endsWith("/*"), 'Route path "' + path + '" will be treated as if it were ' + ('"' + path.replace(/\*$/, "/*") + '" because the `*` character must ') + "always follow a `/` in the pattern. To get rid of this warning, " + ('please change the route path to "' + path.replace(/\*$/, "/*") + '".'));
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(/\/:([\w-]+)(\?)?/g, (_, paramName, isOptional) => {
    params.push({
      paramName,
      isOptional: isOptional != null
    });
    return isOptional ? "/?([^\\/]+)?" : "/([^\\/]+)";
  });
  if (path.endsWith("*")) {
    params.push({
      paramName: "*"
    });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else ;
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v) => decodeURIComponent(v).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(false, 'The URL path "' + value + '" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent ' + ("encoding (" + error + ")."));
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/") return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
const joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/");
const normalizePathname = (pathname) => pathname.replace(/\/+$/, "").replace(/^\/*/, "/");
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
const validMutationMethodsArr = ["post", "put", "patch", "delete"];
new Set(validMutationMethodsArr);
const validRequestMethodsArr = ["get", ...validMutationMethodsArr];
new Set(validRequestMethodsArr);
/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
const DataRouterContext = /* @__PURE__ */ React.createContext(null);
if (process.env.NODE_ENV !== "production") {
  DataRouterContext.displayName = "DataRouter";
}
const DataRouterStateContext = /* @__PURE__ */ React.createContext(null);
if (process.env.NODE_ENV !== "production") {
  DataRouterStateContext.displayName = "DataRouterState";
}
const AwaitContext = /* @__PURE__ */ React.createContext(null);
if (process.env.NODE_ENV !== "production") {
  AwaitContext.displayName = "Await";
}
const NavigationContext = /* @__PURE__ */ React.createContext(null);
if (process.env.NODE_ENV !== "production") {
  NavigationContext.displayName = "Navigation";
}
const LocationContext = /* @__PURE__ */ React.createContext(null);
if (process.env.NODE_ENV !== "production") {
  LocationContext.displayName = "Location";
}
const RouteContext = /* @__PURE__ */ React.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
if (process.env.NODE_ENV !== "production") {
  RouteContext.displayName = "Route";
}
const RouteErrorContext = /* @__PURE__ */ React.createContext(null);
if (process.env.NODE_ENV !== "production") {
  RouteErrorContext.displayName = "RouteError";
}
function useInRouterContext() {
  return React.useContext(LocationContext) != null;
}
function useLocation() {
  !useInRouterContext() ? process.env.NODE_ENV !== "production" ? invariant(
    false,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useLocation() may be used only in the context of a <Router> component."
  ) : invariant(false) : void 0;
  return React.useContext(LocationContext).location;
}
function useRoutes(routes, locationArg) {
  return useRoutesImpl(routes, locationArg);
}
function useRoutesImpl(routes, locationArg, dataRouterState, future) {
  !useInRouterContext() ? process.env.NODE_ENV !== "production" ? invariant(
    false,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useRoutes() may be used only in the context of a <Router> component."
  ) : invariant(false) : void 0;
  let {
    navigator
  } = React.useContext(NavigationContext);
  let {
    matches: parentMatches
  } = React.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  let parentPathname = routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  let parentRoute = routeMatch && routeMatch.route;
  if (process.env.NODE_ENV !== "production") {
    let parentPath = parentRoute && parentRoute.path || "";
    warningOnce(parentPathname, !parentRoute || parentPath.endsWith("*"), "You rendered descendant <Routes> (or called `useRoutes()`) at " + ('"' + parentPathname + '" (under <Route path="' + parentPath + '">) but the ') + `parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

` + ('Please change the parent <Route path="' + parentPath + '"> to <Route ') + ('path="' + (parentPath === "/" ? "*" : parentPath + "/*") + '">.'));
  }
  let locationFromContext = useLocation();
  let location;
  if (locationArg) {
    var _parsedLocationArg$pa;
    let parsedLocationArg = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
    !(parentPathnameBase === "/" || ((_parsedLocationArg$pa = parsedLocationArg.pathname) == null ? void 0 : _parsedLocationArg$pa.startsWith(parentPathnameBase))) ? process.env.NODE_ENV !== "production" ? invariant(false, "When overriding the location using `<Routes location>` or `useRoutes(routes, location)`, the location pathname must begin with the portion of the URL pathname that was " + ('matched by all parent routes. The current pathname base is "' + parentPathnameBase + '" ') + ('but pathname "' + parsedLocationArg.pathname + '" was given in the `location` prop.')) : invariant(false) : void 0;
    location = parsedLocationArg;
  } else {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, {
    pathname: remainingPathname
  });
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_ENV !== "production" ? warning(parentRoute || matches != null, 'No routes matched location "' + location.pathname + location.search + location.hash + '" ') : void 0;
    process.env.NODE_ENV !== "production" ? warning(matches == null || matches[matches.length - 1].route.element !== void 0 || matches[matches.length - 1].route.Component !== void 0 || matches[matches.length - 1].route.lazy !== void 0, 'Matched leaf route at location "' + location.pathname + location.search + location.hash + '" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.') : void 0;
  }
  let renderedMatches = _renderMatches(matches && matches.map((match) => Object.assign({}, match, {
    params: Object.assign({}, parentParams, match.params),
    pathname: joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator.encodeLocation ? navigator.encodeLocation(match.pathname).pathname : match.pathname
    ]),
    pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator.encodeLocation ? navigator.encodeLocation(match.pathnameBase).pathname : match.pathnameBase
    ])
  })), parentMatches, dataRouterState, future);
  if (locationArg && renderedMatches) {
    return /* @__PURE__ */ React.createElement(LocationContext.Provider, {
      value: {
        location: _extends({
          pathname: "/",
          search: "",
          hash: "",
          state: null,
          key: "default"
        }, location),
        navigationType: Action.Pop
      }
    }, renderedMatches);
  }
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? error.status + " " + error.statusText : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = {
    padding: "0.5rem",
    backgroundColor: lightgrey
  };
  let codeStyles = {
    padding: "2px 4px",
    backgroundColor: lightgrey
  };
  let devInfo = null;
  if (process.env.NODE_ENV !== "production") {
    console.error("Error handled by React Router default ErrorBoundary:", error);
    devInfo = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, "💿 Hey developer 👋"), /* @__PURE__ */ React.createElement("p", null, "You can provide a way better UX than this when your app throws errors by providing your own ", /* @__PURE__ */ React.createElement("code", {
      style: codeStyles
    }, "ErrorBoundary"), " or", " ", /* @__PURE__ */ React.createElement("code", {
      style: codeStyles
    }, "errorElement"), " prop on your route."));
  }
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ React.createElement("h3", {
    style: {
      fontStyle: "italic"
    }
  }, message), stack ? /* @__PURE__ */ React.createElement("pre", {
    style: preStyles
  }, stack) : null, devInfo);
}
const defaultErrorElement = /* @__PURE__ */ React.createElement(DefaultErrorComponent, null);
class RenderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Router caught the following error during render", error, errorInfo);
  }
  render() {
    return this.state.error !== void 0 ? /* @__PURE__ */ React.createElement(RouteContext.Provider, {
      value: this.props.routeContext
    }, /* @__PURE__ */ React.createElement(RouteErrorContext.Provider, {
      value: this.state.error,
      children: this.props.component
    })) : this.props.children;
  }
}
function RenderedRoute(_ref) {
  let {
    routeContext,
    match,
    children
  } = _ref;
  let dataRouterContext = React.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ React.createElement(RouteContext.Provider, {
    value: routeContext
  }, children);
}
function _renderMatches(matches, parentMatches, dataRouterState, future) {
  var _dataRouterState;
  if (parentMatches === void 0) {
    parentMatches = [];
  }
  if (dataRouterState === void 0) {
    dataRouterState = null;
  }
  if (future === void 0) {
    future = null;
  }
  if (matches == null) {
    var _future;
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if ((_future = future) != null && _future.v7_partialHydration && parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = (_dataRouterState = dataRouterState) == null ? void 0 : _dataRouterState.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex((m) => m.route.id && (errors == null ? void 0 : errors[m.route.id]) !== void 0);
    !(errorIndex >= 0) ? process.env.NODE_ENV !== "production" ? invariant(false, "Could not find a matching route for errors on route IDs: " + Object.keys(errors).join(",")) : invariant(false) : void 0;
    renderedMatches = renderedMatches.slice(0, Math.min(renderedMatches.length, errorIndex + 1));
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState && future && future.v7_partialHydration) {
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }
      if (match.route.id) {
        let {
          loaderData,
          errors: errors2
        } = dataRouterState;
        let needsToRunLoader = match.route.loader && loaderData[match.route.id] === void 0 && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  return renderedMatches.reduceRight((outlet, match, index) => {
    let error;
    let shouldRenderHydrateFallback = false;
    let errorElement = null;
    let hydrateFallbackElement = null;
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : void 0;
      errorElement = match.route.errorElement || defaultErrorElement;
      if (renderFallback) {
        if (fallbackIndex < 0 && index === 0) {
          warningOnce("route-fallback", false, "No `HydrateFallback` element provided to render during initial hydration");
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = null;
        } else if (fallbackIndex === index) {
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = match.route.hydrateFallbackElement || null;
        }
      }
    }
    let matches2 = parentMatches.concat(renderedMatches.slice(0, index + 1));
    let getChildren = () => {
      let children;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        children = /* @__PURE__ */ React.createElement(match.route.Component, null);
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }
      return /* @__PURE__ */ React.createElement(RenderedRoute, {
        match,
        routeContext: {
          outlet,
          matches: matches2,
          isDataRoute: dataRouterState != null
        },
        children
      });
    };
    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0) ? /* @__PURE__ */ React.createElement(RenderErrorBoundary, {
      location: dataRouterState.location,
      revalidation: dataRouterState.revalidation,
      component: errorElement,
      error,
      children: getChildren(),
      routeContext: {
        outlet: null,
        matches: matches2,
        isDataRoute: true
      }
    }) : getChildren();
  }, null);
}
var DataRouterStateHook = /* @__PURE__ */ function(DataRouterStateHook2) {
  DataRouterStateHook2["UseBlocker"] = "useBlocker";
  DataRouterStateHook2["UseLoaderData"] = "useLoaderData";
  DataRouterStateHook2["UseActionData"] = "useActionData";
  DataRouterStateHook2["UseRouteError"] = "useRouteError";
  DataRouterStateHook2["UseNavigation"] = "useNavigation";
  DataRouterStateHook2["UseRouteLoaderData"] = "useRouteLoaderData";
  DataRouterStateHook2["UseMatches"] = "useMatches";
  DataRouterStateHook2["UseRevalidator"] = "useRevalidator";
  DataRouterStateHook2["UseNavigateStable"] = "useNavigate";
  DataRouterStateHook2["UseRouteId"] = "useRouteId";
  return DataRouterStateHook2;
}(DataRouterStateHook || {});
function getDataRouterConsoleError(hookName) {
  return hookName + " must be used within a data router.  See https://reactrouter.com/v6/routers/picking-a-router.";
}
function useDataRouterState(hookName) {
  let state = React.useContext(DataRouterStateContext);
  !state ? process.env.NODE_ENV !== "production" ? invariant(false, getDataRouterConsoleError(hookName)) : invariant(false) : void 0;
  return state;
}
function useRouteContext(hookName) {
  let route = React.useContext(RouteContext);
  !route ? process.env.NODE_ENV !== "production" ? invariant(false, getDataRouterConsoleError(hookName)) : invariant(false) : void 0;
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext(hookName);
  let thisRoute = route.matches[route.matches.length - 1];
  !thisRoute.route.id ? process.env.NODE_ENV !== "production" ? invariant(false, hookName + ' can only be used on routes that contain a unique "id"') : invariant(false) : void 0;
  return thisRoute.route.id;
}
function useRouteError() {
  var _state$errors;
  let error = React.useContext(RouteErrorContext);
  let state = useDataRouterState(DataRouterStateHook.UseRouteError);
  let routeId = useCurrentRouteId(DataRouterStateHook.UseRouteError);
  if (error !== void 0) {
    return error;
  }
  return (_state$errors = state.errors) == null ? void 0 : _state$errors[routeId];
}
const alreadyWarned$1 = {};
function warningOnce(key, cond, message) {
  if (!cond && !alreadyWarned$1[key]) {
    alreadyWarned$1[key] = true;
    process.env.NODE_ENV !== "production" ? warning(false, message) : void 0;
  }
}
function Route(_props) {
  process.env.NODE_ENV !== "production" ? invariant(false, "A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.") : invariant(false);
}
function Routes(_ref6) {
  let {
    children,
    location
  } = _ref6;
  return useRoutes(createRoutesFromChildren(children), location);
}
new Promise(() => {
});
function createRoutesFromChildren(children, parentPath) {
  if (parentPath === void 0) {
    parentPath = [];
  }
  let routes = [];
  React.Children.forEach(children, (element, index) => {
    if (!/* @__PURE__ */ React.isValidElement(element)) {
      return;
    }
    let treePath = [...parentPath, index];
    if (element.type === React.Fragment) {
      routes.push.apply(routes, createRoutesFromChildren(element.props.children, treePath));
      return;
    }
    !(element.type === Route) ? process.env.NODE_ENV !== "production" ? invariant(false, "[" + (typeof element.type === "string" ? element.type : element.type.name) + "] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>") : invariant(false) : void 0;
    !(!element.props.index || !element.props.children) ? process.env.NODE_ENV !== "production" ? invariant(false, "An index route cannot have child routes.") : invariant(false) : void 0;
    let route = {
      id: element.props.id || treePath.join("-"),
      caseSensitive: element.props.caseSensitive,
      element: element.props.element,
      Component: element.props.Component,
      index: element.props.index,
      path: element.props.path,
      loader: element.props.loader,
      action: element.props.action,
      errorElement: element.props.errorElement,
      ErrorBoundary: element.props.ErrorBoundary,
      hasErrorBoundary: element.props.ErrorBoundary != null || element.props.errorElement != null,
      shouldRevalidate: element.props.shouldRevalidate,
      handle: element.props.handle,
      lazy: element.props.lazy
    };
    if (element.props.children) {
      route.children = createRoutesFromChildren(element.props.children, treePath);
    }
    routes.push(route);
  });
  return routes;
}
const THRESHOLDS = [
  {
    field: "Title",
    rows: [
      { range: "< 30 chars", status: "Too Short", color: "#d02b20" },
      { range: "30–49 chars", status: "Short", color: "#c07000" },
      { range: "50–60 chars", status: "Optimal", color: "#328048" },
      { range: "61–65 chars", status: "Long", color: "#c07000" },
      { range: "> 65 chars", status: "Too Long", color: "#d02b20" }
    ]
  },
  {
    field: "Description",
    rows: [
      { range: "< 120 chars", status: "Too Short", color: "#d02b20" },
      { range: "120–149 chars", status: "Short", color: "#c07000" },
      { range: "150–160 chars", status: "Optimal", color: "#328048" },
      { range: "161–165 chars", status: "Long", color: "#c07000" },
      { range: "> 165 chars", status: "Too Long", color: "#d02b20" }
    ]
  }
];
const CONTENT_RULES = [
  { condition: "Empty field", severity: "🔴 Error", color: "#d02b20" },
  { condition: "< 300 words", severity: "🔴 Error", color: "#d02b20" },
  { condition: "> 5000 words", severity: "🔴 Error", color: "#d02b20" },
  {
    condition: "Sentence > 25 words",
    severity: "⚠️ Warning",
    color: "#c07000"
  }
];
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Open any edit view",
    desc: "Navigate to Content Manager and open any entry to edit."
  },
  {
    step: "02",
    title: "Start typing",
    desc: "Inline stats appear below the title and description fields immediately."
  },
  {
    step: "03",
    title: "Check the sidebar",
    desc: "The right panel shows deep stats and validation rules for whichever field is active."
  },
  {
    step: "04",
    title: "Follow the guidance",
    desc: "Green means optimal. Orange means acceptable. Red means action needed."
  }
];
const SUPPORT_LINKS = [
  {
    label: "Report an issue",
    href: "https://github.com/Starstack-Technologies/strapi-plugin-content-optimizer/issues",
    desc: "GitHub Issues"
  },
  {
    label: "View documentation",
    href: "https://github.com/Starstack-Technologies/strapi-plugin-content-optimizer#readme",
    desc: "README on GitHub"
  },
  {
    label: "Starstack",
    href: "https://www.starstacktech.com/strapi-services/",
    desc: "Starstack"
  }
];
const SectionHeader = ({ label }) => /* @__PURE__ */ jsx(R, { marginBottom: 4, children: /* @__PURE__ */ jsx(
  I,
  {
    variant: "sigma",
    textColor: "neutral500",
    style: {
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      fontSize: 11
    },
    children: label
  }
) });
const ThresholdTable = ({ field, rows }) => /* @__PURE__ */ jsxs(R, { marginBottom: 6, children: [
  /* @__PURE__ */ jsx(
    I,
    {
      variant: "delta",
      fontWeight: "semiBold",
      textColor: "neutral700",
      marginBottom: 3,
      children: field
    }
  ),
  /* @__PURE__ */ jsx(
    R,
    {
      style: {
        border: "1px solid #eaeaef",
        borderRadius: 8,
        overflow: "hidden"
      },
      children: rows.map((row, i) => /* @__PURE__ */ jsxs(
        T,
        {
          justifyContent: "space-between",
          alignItems: "center",
          style: {
            padding: "10px 16px",
            background: i % 2 === 0 ? "#ffffff" : "#fafafa",
            borderBottom: i < rows.length - 1 ? "1px solid #eaeaef" : "none"
          },
          children: [
            /* @__PURE__ */ jsx(
              I,
              {
                variant: "pi",
                textColor: "neutral600",
                style: { fontFamily: "monospace", width: 120, flexShrink: 0 },
                children: row.range
              }
            ),
            /* @__PURE__ */ jsx(
              R,
              {
                style: {
                  background: row.color + "18",
                  border: `1px solid ${row.color}40`,
                  borderRadius: 4,
                  padding: "2px 10px",
                  width: 72,
                  textAlign: "center",
                  flexShrink: 0
                },
                children: /* @__PURE__ */ jsx(
                  I,
                  {
                    variant: "pi",
                    fontWeight: "semiBold",
                    style: { color: row.color },
                    children: row.status
                  }
                )
              }
            )
          ]
        },
        i
      ))
    }
  )
] });
const HomePage = () => {
  return /* @__PURE__ */ jsxs(Layouts.Root, { children: [
    /* @__PURE__ */ jsx(Page.Title, { children: "Content Optimizer" }),
    /* @__PURE__ */ jsx(Layouts.Content, { children: /* @__PURE__ */ jsxs(
      R,
      {
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 10,
        children: [
          /* @__PURE__ */ jsxs(R, { marginBottom: 8, children: [
            /* @__PURE__ */ jsxs(T, { alignItems: "center", gap: 3, marginBottom: 2, children: [
              /* @__PURE__ */ jsx(
                I,
                {
                  variant: "alpha",
                  fontWeight: "bold",
                  textColor: "neutral800",
                  children: "Content Optimizer"
                }
              ),
              /* @__PURE__ */ jsx(
                R,
                {
                  style: {
                    background: "#eafbea",
                    border: "1px solid #67ae6e",
                    borderRadius: 20,
                    padding: "2px 10px"
                  },
                  children: /* @__PURE__ */ jsx(
                    I,
                    {
                      variant: "pi",
                      fontWeight: "semiBold",
                      style: { color: "#1d6b3e" },
                      children: "v1.0.0"
                    }
                  )
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              I,
              {
                variant: "omega",
                textColor: "neutral500",
                style: { maxWidth: 520 },
                children: "Real-time SEO and readability analysis, injected directly into the Content Manager edit view. Feedback updates live as you type - no page reload required."
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(T, { gap: 8, alignItems: "flex-start", children: [
            /* @__PURE__ */ jsxs(R, { style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxs(
                R,
                {
                  padding: 6,
                  marginBottom: 6,
                  style: {
                    border: "1px solid #eaeaef",
                    borderRadius: 8,
                    background: "#ffffff"
                  },
                  children: [
                    /* @__PURE__ */ jsx(SectionHeader, { label: "How It Works" }),
                    /* @__PURE__ */ jsx(T, { direction: "column", gap: 0, style: { width: "100%" }, children: HOW_IT_WORKS.map(({ step, title, desc }, i) => /* @__PURE__ */ jsxs(R, { style: { width: "100%" }, children: [
                      /* @__PURE__ */ jsxs(
                        T,
                        {
                          gap: 4,
                          alignItems: "flex-start",
                          paddingTop: 3,
                          paddingBottom: 3,
                          style: { width: "100%", justifyContent: "flex-start" },
                          children: [
                            /* @__PURE__ */ jsx(
                              R,
                              {
                                style: {
                                  width: 32,
                                  height: 32,
                                  minWidth: 32,
                                  borderRadius: "50%",
                                  background: "#f0f0ff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                },
                                children: /* @__PURE__ */ jsx(
                                  I,
                                  {
                                    variant: "pi",
                                    fontWeight: "bold",
                                    style: { color: "#4945ff" },
                                    children: step
                                  }
                                )
                              }
                            ),
                            /* @__PURE__ */ jsxs(R, { style: { flex: 1, minWidth: 0 }, children: [
                              /* @__PURE__ */ jsx(
                                I,
                                {
                                  variant: "omega",
                                  fontWeight: "semiBold",
                                  textColor: "neutral800",
                                  style: { display: "block" },
                                  children: title
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                I,
                                {
                                  variant: "pi",
                                  textColor: "neutral500",
                                  style: { display: "block", marginTop: 2 },
                                  children: desc
                                }
                              )
                            ] })
                          ]
                        }
                      ),
                      i < HOW_IT_WORKS.length - 1 && /* @__PURE__ */ jsx(yl, {})
                    ] }, step)) })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                R,
                {
                  padding: 6,
                  style: {
                    border: "1px solid #eaeaef",
                    borderRadius: 8,
                    background: "#ffffff"
                  },
                  children: [
                    /* @__PURE__ */ jsx(SectionHeader, { label: "Status Thresholds" }),
                    THRESHOLDS.map((t) => /* @__PURE__ */ jsx(ThresholdTable, { field: t.field, rows: t.rows }, t.field)),
                    /* @__PURE__ */ jsx(
                      I,
                      {
                        variant: "delta",
                        fontWeight: "semiBold",
                        textColor: "neutral700",
                        marginBottom: 3,
                        children: "Content"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      R,
                      {
                        style: {
                          border: "1px solid #eaeaef",
                          borderRadius: 8,
                          overflow: "hidden"
                        },
                        children: CONTENT_RULES.map((row, i) => /* @__PURE__ */ jsxs(
                          T,
                          {
                            justifyContent: "space-between",
                            alignItems: "center",
                            style: {
                              padding: "10px 16px",
                              background: i % 2 === 0 ? "#ffffff" : "#fafafa",
                              borderBottom: i < CONTENT_RULES.length - 1 ? "1px solid #eaeaef" : "none"
                            },
                            children: [
                              /* @__PURE__ */ jsx(
                                I,
                                {
                                  variant: "pi",
                                  textColor: "neutral600",
                                  style: {
                                    fontFamily: "monospace",
                                    width: 160,
                                    flexShrink: 0
                                  },
                                  children: row.condition
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                I,
                                {
                                  variant: "pi",
                                  fontWeight: "semiBold",
                                  style: { color: row.color },
                                  children: row.severity
                                }
                              )
                            ]
                          },
                          i
                        ))
                      }
                    )
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx(R, { style: { width: 280, flexShrink: 0 }, children: /* @__PURE__ */ jsxs(
              R,
              {
                padding: 6,
                style: {
                  border: "1px solid #eaeaef",
                  borderRadius: 8,
                  background: "#ffffff"
                },
                children: [
                  /* @__PURE__ */ jsx(SectionHeader, { label: "Support & Resources" }),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      style: { display: "flex", flexDirection: "column", gap: 12 },
                      children: SUPPORT_LINKS.map(({ label, href, desc }) => /* @__PURE__ */ jsx(
                        "a",
                        {
                          href,
                          target: "_blank",
                          rel: "noopener noreferrer",
                          style: {
                            textDecoration: "none",
                            display: "block",
                            width: "100%"
                          },
                          children: /* @__PURE__ */ jsxs(
                            "div",
                            {
                              style: {
                                padding: "12px 16px",
                                background: "#f6f6f9",
                                borderRadius: 6,
                                border: "1px solid #eaeaef",
                                width: "100%",
                                boxSizing: "border-box"
                              },
                              children: [
                                /* @__PURE__ */ jsxs(
                                  I,
                                  {
                                    variant: "omega",
                                    fontWeight: "semiBold",
                                    style: { color: "#4945ff", display: "block" },
                                    children: [
                                      label,
                                      " →"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  I,
                                  {
                                    variant: "pi",
                                    textColor: "neutral400",
                                    style: { display: "block", marginTop: 2 },
                                    children: desc
                                  }
                                )
                              ]
                            }
                          )
                        },
                        label
                      ))
                    }
                  )
                ]
              }
            ) })
          ] })
        ]
      }
    ) })
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsx(Routes, { children: /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(HomePage, {}) }) });
};
export {
  App
};
