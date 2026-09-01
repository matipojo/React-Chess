import { useEffect, useState } from "react";
import { AppRoute, migrateLegacyLocation, parseAppRoute } from "../utils/appRoute";

export function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => migrateLegacyLocation());

  useEffect(() => {
    const sync = () => setRoute(parseAppRoute(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return route;
}
