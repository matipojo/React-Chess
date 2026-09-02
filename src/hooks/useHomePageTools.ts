import { useEffect } from "react";
import { ToolResponse } from "../model-context-types";
import { registerModelContextTools } from "../utils/registerModelContextTools";
import { listSitePages, navigateToSitePage, parseSitePageId } from "../utils/sitePages";

const LIST_PAGES_MESSAGE =
  "This is the Generative Learning home page. The sub-navigation includes Chess and Triangles, both working interactive learning apps. Circuits, Chemistry, Music, and Maps are coming later. Call open-page with page=chess or page=triangles. Teaching tools for a subject are not on this home page. They appear after that navigation.";

export function useHomePageTools() {
  useEffect(() => {
    return registerModelContextTools([
      {
        name: "list-pages",
        description:
          "Lists this site's pages and learning surfaces. You are on the Generative Learning home page. The sub-navigation includes Chess and Triangles (working apps). Other subjects are coming later. Call this to see where you can go, then open-page with page=chess or page=triangles. Chess tools such as get-board-state and triangle tools such as apply-gan are not available until that page loads.",
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
          "Navigate to another page in this site. Use page=chess to open the chess learning app, or page=triangles to open the geometry app. After that navigation, wait for that page's tools before teaching. Use page=about or page=home to return to this home page.",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "string",
              enum: ["chess", "triangles", "about", "home"],
              description:
                "chess = chess learning app. triangles = triangle geometry app. about or home = this home page.",
            },
          },
          required: ["page"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const page = parseSitePageId(params.page);
          if (!page) {
            return {
              success: false,
              message: 'Provide page: "chess", "triangles", "about", or "home".',
              data: null,
            };
          }
          return navigateToSitePage(page);
        },
      },
    ]);
  }, []);
}
