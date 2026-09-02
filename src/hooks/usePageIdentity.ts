import { useEffect } from "react";
import { AppRoute } from "../utils/appRoute";
import { applyPageIdentity } from "../utils/pageIdentity";

export function usePageIdentity(route: AppRoute) {
  useEffect(() => {
    applyPageIdentity(route);
  }, [route]);
}
