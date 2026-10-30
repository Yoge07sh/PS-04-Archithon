const API_URL = "http://localhost:3000";

export const getSyncOperations = async ({
  page = 1,
  limit = 10,
  status = "",
  entityType = "",
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) params.append("status", status);
  if (entityType) params.append("entityType", entityType);

  const response = await fetch(
    `${API_URL}/sync/operations?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch operations");
  }

  return data;
};
