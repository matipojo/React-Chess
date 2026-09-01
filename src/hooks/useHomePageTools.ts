import { useEffect } from "react";
import { ToolResponse } from "../model-context-types";
import { registerModelContextTools } from "../utils/registerModelContextTools";
import { listSitePages, navigateToSitePage, parseSitePageId } from "../utils/sitePages";

const LIST_PAGES_MESSAGE =
  "This is the Living Learning Surfaces home page. The sub-navigation includes Chess, a working interactive chess learning app (the second page). Geometry, Circuits, Chemistry, Music, and Maps are coming later. Call open-page with page=chess to open the chess app. Chess teaching tools are not on this home page — they appear after that navigation.";

export function useHomePageTools() {
  useEffect(() => {
    return registerModelContextTools([
      {
        name: "list-pages",
        description:
          "Lists this site's pages and learning surfaces. You are on the Living Learning Surfaces home page. The sub-navigation includes Chess, a working chess lesson app (the second page). Other subjects are coming later. Call this to see where you can go, then open-page with page=chess to leave this home page and open the chess app. Chess tools such as get-board-state are not available until that page loads.",
        inputSchema: { type: "object", properties: {} },
        execute: async (): Promise<ToolResponse> => ({
          success: true,
          message: LIST_PAGES_MESSAGE,
          data: listSitePages(),
        }),
      },
      {
        name: "open-page",
        description:
          "Navigate to another page in this site. Use page=chess to open the chess learning app from the home page sub-navigation (the second page). After that navigation, wait for chess tools such as get-board-state, make-move, enter-learn-mode, and create-lesson before teaching chess. Use page=about to return to this home page.",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "string",
              enum: ["chess", "about"],
              description:
                'chess = the chess learning app in the sub-navigation (second page). about = this home page.',
            },
          },
          required: ["page"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const page = parseSitePageId(params.page);
          if (!page) {
            return {
              success: false,
              message: 'Provide page: "chess" or "about". Chess is the working app in the sub-navigation.',
              data: null,
            };
          }
          return navigateToSitePage(page);
        },
      },
    ]);
  }, []);
}
