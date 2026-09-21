export interface NavLink {
  labelKey: string;
  href: string;
}

export interface HeaderActionsProps {
  nav: readonly NavLink[];
}
