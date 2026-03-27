import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

// Cache for workspace members
let cachedMembersPromise: Promise<any[]> | null = null;
const GLOBAL_REFRESH_INTERVAL = 60000;

/**
 * Get all workspace members from ClickUp API
 * Uses GET /v2/team endpoint which includes members in the response
 */
async function getWorkspaceMembers(workspaceId?: string): Promise<any[]> {
  const teamId = workspaceId || CONFIG.teamId;

  // Return cached promise if available
  if (cachedMembersPromise) {
    return cachedMembersPromise;
  }

  const fetchPromise = (async (): Promise<any[]> => {
    try {
      const response = await fetch(`https://api.clickup.com/api/v2/team`, {
        headers: { Authorization: CONFIG.apiKey },
      });

      if (!response.ok) {
        throw new Error(`Error fetching teams: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.teams || !Array.isArray(data.teams)) {
        return [];
      }

      // Find the team that matches our configured team ID
      const currentTeam = data.teams.find((team: any) => team.id === teamId);
      if (!currentTeam || !currentTeam.members || !Array.isArray(currentTeam.members)) {
        console.error(`Team ${teamId} not found or has no members`);
        return [];
      }

      // Extract full member information
      return currentTeam.members.map((member: any) => ({
        id: member.user?.id,
        username: member.user?.username || 'Unknown',
        email: member.user?.email || 'Unknown',
        role: getRoleName(member.user?.role),
        profilePicture: member.user?.profilePicture || null,
      })).filter((m: any) => m.id);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  })();

  // Cache the promise
  cachedMembersPromise = fetchPromise;

  // Auto-cleanup after 60 seconds
  setTimeout(() => {
    cachedMembersPromise = null;
    console.error('Auto-cleaned workspace members cache');
  }, GLOBAL_REFRESH_INTERVAL);

  return fetchPromise;
}

/**
 * Get members who have access to a specific list
 */
async function getListMembers(listId: string): Promise<any[]> {
  try {
    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/member`, {
      headers: { Authorization: CONFIG.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Error fetching list members: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.members || !Array.isArray(data.members)) {
      return [];
    }

    return data.members.map((member: any) => ({
      id: member.id,
      username: member.username || 'Unknown',
      email: member.email || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching list members:', error);
    return [];
  }
}

/**
 * Convert role number to human-readable name
 */
function getRoleName(role: number): string {
  const roles: { [key: number]: string } = {
    1: 'Owner',
    2: 'Admin',
    3: 'Member',
    4: 'Guest',
  };
  return roles[role] || 'Unknown';
}

/**
 * Register member tools with the MCP server
 */
export function registerMemberTools(server: McpServer) {
  // Get Workspace Members
  server.tool(
    "getWorkspaceMembers",
    [
      "Get ALL members (users) of the ClickUp workspace.",
      "Returns a list with member IDs, usernames, emails, and roles.",
      "Use this tool when:",
      "- User asks 'who are the team members?'",
      "- User wants to assign a task but doesn't specify to whom",
      "- You need to know available users for assignment",
      "- User asks 'list the team' or 'who works here'",
      "",
      "IMPORTANT: Always use this tool BEFORE asking 'to whom should I assign?'",
      "so you can offer concrete options to the user."
    ].join("\n"),
    {
      workspace_id: z
        .string()
        .optional()
        .describe("The workspace/team ID. Defaults to the configured team ID (90131406025)."),
    },
    {
      readOnlyHint: true,
    },
    async ({ workspace_id }) => {
      try {
        const members = await getWorkspaceMembers(workspace_id);

        if (members.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No members found in this workspace. Verify the workspace ID and API permissions.",
              },
            ],
          };
        }

        // Format as readable list
        const formattedList = members
          .map((m: any) => `- ${m.username} (ID: ${m.id}, Email: ${m.email}, Role: ${m.role})`)
          .join('\n');

        return {
          content: [
            {
              type: "text",
              text: `Found ${members.length} member(s) in the workspace:\n\n${formattedList}\n\nMember details (JSON):\n${JSON.stringify(members, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error getting workspace members:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting workspace members: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get List Members
  server.tool(
    "getListMembers",
    [
      "Get members who have EXPLICIT ACCESS to a specific list.",
      "Returns a list with member IDs, usernames, and emails.",
      "Use this tool when:",
      "- You're working within a specific list context",
      "- User wants to know who has access to a particular list",
      "- You need to filter members relevant to a specific project/list",
      "",
      "NOTE: This returns only members with direct access, not the entire workspace.",
      "For a complete list of all team members, use getWorkspaceMembers instead."
    ].join("\n"),
    {
      list_id: z
        .string()
        .describe("The list ID to get members for. Example: '901312479697' (Dental Studio)"),
    },
    {
      readOnlyHint: true,
    },
    async ({ list_id }) => {
      try {
        const members = await getListMembers(list_id);

        if (members.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No members found with explicit access to list ${list_id}. This could mean members have access through the team/space/folder hierarchy instead.`,
              },
            ],
          };
        }

        // Format as readable list
        const formattedList = members
          .map((m: any) => `- ${m.username} (ID: ${m.id}, Email: ${m.email})`)
          .join('\n');

        return {
          content: [
            {
              type: "text",
              text: `Found ${members.length} member(s) with explicit access to list ${list_id}:\n\n${formattedList}\n\nMember details (JSON):\n${JSON.stringify(members, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error getting list members:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting list members: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
