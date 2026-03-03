// server/linkedin.ts
// LinkedIn API v2 helper functions.
// Uses OAuth 2.0 access token stored in Supabase connections table.

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

interface LinkedInShareResponse {
  id: string;
}

interface LinkedInUserResponse {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    "displayImage~"?: {
      elements?: Array<{
        identifiers: Array<{ identifier: string }>;
      }>;
    };
  };
}

interface LinkedInOrganizationResponse {
  elements: Array<{
    organization: string;
    "organization~": { localizedName: string };
    role: string;
  }>;
}

/** Post a text/image share to LinkedIn personal profile or company page */
export async function postLinkedInShare(
  accessToken: string,
  authorUrn: string, // e.g. "urn:li:person:xxx" or "urn:li:organization:xxx"
  text: string,
  imageUrl?: string
): Promise<{ id: string }> {
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text },
    shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
  };

  if (imageUrl) {
    shareContent.media = [
      {
        status: "READY",
        description: { text },
        media: imageUrl,
        title: { text: text.slice(0, 100) },
      },
    ];
  }

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent,
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(
      String((err as { message?: string }).message || `LinkedIn API error: ${res.status}`)
    );
  }

  const data = (await res.json()) as LinkedInShareResponse;
  return { id: data.id };
}

/** Get authenticated LinkedIn user info */
export async function getLinkedInUser(
  accessToken: string
): Promise<{ id: string; name: string; profileImageUrl?: string; urn: string }> {
  const res = await fetch(
    `${LINKEDIN_API_BASE}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`LinkedIn API error: ${res.status}`);
  }

  const data = (await res.json()) as LinkedInUserResponse;
  const name = `${data.localizedFirstName} ${data.localizedLastName}`.trim();
  const elements = data.profilePicture?.["displayImage~"]?.elements;
  const profileImageUrl = elements?.[elements.length - 1]?.identifiers?.[0]?.identifier;

  return {
    id: data.id,
    name,
    profileImageUrl,
    urn: `urn:li:person:${data.id}`,
  };
}

/** Get LinkedIn company pages the user administers */
export async function getLinkedInOrganizations(
  accessToken: string
): Promise<Array<{ id: string; name: string; urn: string }>> {
  const res = await fetch(
    `${LINKEDIN_API_BASE}/organizationAcls?q=roleAssignee&projection=(elements*(organization~(id,localizedName),role))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  if (!res.ok) {
    return []; // Non-critical — user may not admin any pages
  }

  const data = (await res.json()) as LinkedInOrganizationResponse;
  return (data.elements ?? [])
    .filter((e) => e.role === "ADMINISTRATOR")
    .map((e) => {
      const orgId = e.organization.split(":").pop() ?? "";
      return {
        id: orgId,
        name: e["organization~"]?.localizedName ?? orgId,
        urn: e.organization,
      };
    });
}

/** Build LinkedIn OAuth 2.0 authorization URL */
export function buildLinkedInAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "r_liteprofile r_emailaddress w_member_social rw_organization_admin",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}
