export interface SharePointDoc {
  id: string;
  name: string;
  title?: string;
  webUrl: string;
  snippet?: string;
  lastModifiedDateTime: string;
  createdDateTime: string;
  size?: number;
}

export async function getSharePointDocs(
  accessToken: string,
  siteId: string
): Promise<SharePointDoc[]> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      title: item.title || item.name,
      webUrl: item.webUrl,
      snippet: item.description,
      lastModifiedDateTime: item.lastModifiedDateTime,
      createdDateTime: item.createdDateTime,
      size: item.size
    }));
  } catch (error) {
    return [];
  }
}

export async function searchSharePointContent(
  accessToken: string,
  query: string
): Promise<SharePointDoc[]> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/search/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              entityTypes: ['driveItem'],
              query: {
                queryString: query
              }
            }
          ]
        })
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const hits = data.value[0]?.hitsContainers[0]?.hits || [];

    return hits.map((hit: any) => ({
      id: hit.resource.id,
      name: hit.resource.name,
      title: hit.resource.title || hit.resource.name,
      webUrl: hit.resource.webUrl,
      snippet: hit.summary,
      lastModifiedDateTime: hit.resource.lastModifiedDateTime,
      createdDateTime: hit.resource.createdDateTime,
      size: hit.resource.size
    }));
  } catch (error) {
    return [];
  }
}
