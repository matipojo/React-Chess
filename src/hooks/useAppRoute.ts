import { useEffect, useState } from "react";
import { AppRoute, parseAppRoute } from "../utils/appRoute";

export function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute());

  useEffect(() => {
    const sync = () => setRoute(parseAppRoute(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return route;
}
