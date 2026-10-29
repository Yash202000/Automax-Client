import React from "react";
import {
  Link,
  NavLink,
  type LinkProps,
  type NavLinkProps,
  type To,
} from "react-router-dom";
import { isHiddenModulePath } from "../../constants/hiddenModules";

const toPathname = (to: To): string =>
  typeof to === "string" ? to.split(/[?#]/)[0] : (to.pathname ?? "");

/**
 * `Link` that renders nothing when `to` points into a hidden module
 * (see constants/hiddenModules). Use it for links into the Goals / KPI area.
 */
export const ModuleLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
  (props, ref) =>
    isHiddenModulePath(toPathname(props.to)) ? null : (
      <Link ref={ref} {...props} />
    ),
);
ModuleLink.displayName = "ModuleLink";

/** `NavLink` version of `ModuleLink`, for sidebar items. */
export const ModuleNavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  (props, ref) =>
    isHiddenModulePath(toPathname(props.to)) ? null : (
      <NavLink ref={ref} {...props} />
    ),
);
ModuleNavLink.displayName = "ModuleNavLink";
