const DEFAULT_DOG_API_BASE_URL = "https://api.thedogapi.com/v1";

type DogApiImage = {
  url?: unknown;
};

function getDogApiBaseUrl() {
  const configuredBaseUrl = process.env.DOG_API_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl || DEFAULT_DOG_API_BASE_URL;
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function fetchRandomDogImageUrl() {
  const response = await fetch(`${getDogApiBaseUrl()}/images/search`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Dog API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Dog API response did not return an image.");
  }

  const firstImage = payload[0] as DogApiImage;
  const url = typeof firstImage?.url === "string" ? firstImage.url.trim() : "";
  if (!url) {
    throw new Error("Dog API response image URL is missing.");
  }

  return url;
}
