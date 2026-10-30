import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../../db/localDB";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PAGE_SIZE = 10;

function SyncOperationList() {
  const [operations, setOperations] = useState([]);
  const [status, setStatus] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load local operations from IndexedDB
  const getLocalOperations = useCallback(async () => {
    const localOperations = await db.syncQueue.toArray();

    return localOperations.map((operation) => ({
      _id: `local-${operation.operationId}`,
      operationId: operation.operationId,
      entityType: String(operation.entityType || "").toLowerCase(),
      entityId: operation.entityId || operation.localId || "-",
      action: String(operation.action || "").toLowerCase(),
      status: String(operation.status || "pending").toLowerCase(),
      createdAt: operation.createdAt,
      isLocal: true,
    }));
  }, []);

  // Fetch server operations
  const getServerOperations = useCallback(async (signal) => {
    const firstParams = new URLSearchParams({
      page: "1",
      limit: "100",
    });

    const firstResponse = await fetch(
      `${API_URL}/sync/operations?${firstParams.toString()}`,
      {
        method: "GET",
        credentials: "include",
        signal,
      },
    );

    const firstData = await firstResponse.json();

    if (!firstResponse.ok) {
      throw new Error(
        firstData.message || "Server operations load nahi ho paayi.",
      );
    }

    let allOperations = firstData.operations || [];
    const totalPages = firstData.pagination?.totalPages || 1;

    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "100",
      });

      const response = await fetch(
        `${API_URL}/sync/operations?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          signal,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Server operations load nahi ho paayi.",
        );
      }

      allOperations = allOperations.concat(data.operations || []);
    }

    return allOperations.map((operation) => ({
      ...operation,
      entityType: String(operation.entityType || "").toLowerCase(),
      action: String(operation.action || "").toLowerCase(),
      status: String(operation.status || "").toLowerCase(),
      isLocal: false,
    }));
  }, []);

  // Merge local and server operations
  const mergeOperations = (serverOperations, localOperations) => {
    const operationMap = new Map();

    localOperations.forEach((operation) => {
      operationMap.set(operation.operationId, operation);
    });

    serverOperations.forEach((operation) => {
      const existing = operationMap.get(operation.operationId);

      if (
        !existing ||
        operation.status === "synced" ||
        existing.status !== "synced"
      ) {
        operationMap.set(operation.operationId, operation);
      }
    });

    return Array.from(operationMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  };

  // Load operations
  const loadOperations = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const localOperations = await getLocalOperations();

        if (!navigator.onLine) {
          setOperations(localOperations);
          setLastUpdated(new Date());
          return;
        }

        try {
          const serverOperations = await getServerOperations(signal);

          if (signal?.aborted) return;

          const merged = mergeOperations(serverOperations, localOperations);

          setOperations(merged);
          setLastUpdated(new Date());
        } catch (apiError) {
          if (apiError.name === "AbortError") return;

          setOperations(localOperations);

          setError(
            "Server se connection nahi ho paaya. Local operations dikha rahe hain.",
          );

          setLastUpdated(new Date());
        }
      } catch (localError) {
        if (localError.name === "AbortError") return;

        setOperations([]);
        setError(
          localError.message || "Local sync operations load nahi ho paayi.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [getLocalOperations, getServerOperations],
  );

  // Network and queue listeners
  useEffect(() => {
    const controller = new AbortController();

    const handleOnline = () => {
      setIsOnline(true);
      loadOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      loadOperations();
    };

    const handleQueueUpdated = () => {
      loadOperations();
    };

    loadOperations(controller.signal);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sync-queue-updated", handleQueueUpdated);
    window.addEventListener("patients-updated", handleQueueUpdated);

    return () => {
      controller.abort();

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sync-queue-updated", handleQueueUpdated);
      window.removeEventListener("patients-updated", handleQueueUpdated);
    };
  }, [loadOperations]);

  // Search and filters
  const filteredOperations = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return operations.filter((operation) => {
      const matchesStatus = !status || operation.status === status;

      const matchesEntity = !entityType || operation.entityType === entityType;

      const matchesSearch =
        !searchText ||
        String(operation.operationId || "")
          .toLowerCase()
          .includes(searchText) ||
        String(operation.entityId || "")
          .toLowerCase()
          .includes(searchText) ||
        String(operation.action || "")
          .toLowerCase()
          .includes(searchText) ||
        String(operation.entityType || "")
          .toLowerCase()
          .includes(searchText);

      return matchesStatus && matchesEntity && matchesSearch;
    });
  }, [operations, status, entityType, search]);

  // Pagination
  const totalPages = Math.ceil(filteredOperations.length / PAGE_SIZE);

  const paginatedOperations = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;

    return filteredOperations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOperations, page]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }

    if (totalPages === 0 && page !== 1) {
      setPage(1);
    }
  }, [page, totalPages]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: operations.length,
      pending: operations.filter((item) => item.status === "pending").length,
      processing: operations.filter((item) => item.status === "processing")
        .length,
      synced: operations.filter((item) => item.status === "synced").length,
      failed: operations.filter((item) => item.status === "failed").length,
      conflict: operations.filter((item) => item.status === "conflict").length,
    };
  }, [operations]);

  const getStatusColor = (value) => {
    const colors = {
      synced: "success",
      pending: "warning",
      processing: "primary",
      failed: "danger",
      conflict: "secondary",
    };

    return colors[value] || "dark";
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleString("en-IN");
  };

  const clearFilters = () => {
    setStatus("");
    setEntityType("");
    setSearch("");
    setPage(1);
  };

  const refreshOperations = () => {
    loadOperations();
  };

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Sync Operations</h2>
          <p className="text-secondary mb-0">
            Monitor offline and server synchronization activity.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span
            className={`badge rounded-pill ${
              isOnline ? "bg-success" : "bg-danger"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={refreshOperations}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="row g-3 mb-4">
        {[
          { title: "Total", value: stats.total, color: "primary" },
          { title: "Pending", value: stats.pending, color: "warning" },
          { title: "Processing", value: stats.processing, color: "info" },
          { title: "Synced", value: stats.synced, color: "success" },
          { title: "Failed", value: stats.failed, color: "danger" },
          { title: "Conflict", value: stats.conflict, color: "secondary" },
        ].map((item) => (
          <div className="col-6 col-md-4 col-xl-2" key={item.title}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <p className="text-secondary small mb-2">{item.title}</p>

                <h3 className={`fw-bold text-${item.color} mb-0`}>
                  {item.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Offline information */}
      {!isOnline && (
        <div className="alert alert-warning">
          <i className="bi bi-wifi-off me-2"></i>
          You are offline. Showing operations saved in this browser. Server sync
          history is unavailable until you reconnect.
        </div>
      )}

      {error && (
        <div className="alert alert-warning" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold">Search</label>

              <input
                type="search"
                className="form-control"
                placeholder="Operation ID, entity, action..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold">Status</label>

              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="synced">Synced</option>
                <option value="failed">Failed</option>
                <option value="conflict">Conflict</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold">Entity</label>

              <select
                className="form-select"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Entities</option>
                <option value="patient">Patient</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="fw-bold mb-0">Operation History</h5>

            <small className="text-secondary">
              {lastUpdated
                ? `Last updated: ${formatDate(lastUpdated)}`
                : "Not refreshed yet"}
            </small>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>

              <p className="text-secondary mt-3 mb-0">Loading operations...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Operation ID</th>
                    <th>Entity</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Source</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedOperations.map((operation) => (
                    <tr key={operation.operationId || operation._id}>
                      <td className="px-3">
                        <span
                          className="small text-break"
                          title={operation.operationId}
                        >
                          {operation.operationId || "—"}
                        </span>
                      </td>

                      <td>
                        <span className="badge bg-light text-dark border">
                          {operation.entityType || "—"}
                        </span>
                      </td>

                      <td>
                        <span className="fw-semibold">
                          {operation.action || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge text-bg-${getStatusColor(
                            operation.status,
                          )}`}
                        >
                          {operation.status || "unknown"}
                        </span>
                      </td>

                      <td className="text-nowrap small">
                        {formatDate(operation.createdAt)}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            operation.isLocal
                              ? "bg-warning text-dark"
                              : "bg-success"
                          }`}
                        >
                          {operation.isLocal ? "Local" : "Server"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {paginatedOperations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        <i className="bi bi-inbox fs-1 text-secondary"></i>

                        <h6 className="fw-semibold mt-3">
                          No sync operations found
                        </h6>

                        <p className="text-secondary small mb-0">
                          Try changing your filters or add a new operation.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredOperations.length > 0 && (
          <div className="card-footer bg-white py-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <small className="text-secondary">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredOperations.length)} of{" "}
                {filteredOperations.length} operations
              </small>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>

                <span className="small text-secondary">
                  Page {page} of {Math.max(totalPages, 1)}
                </span>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncOperationList;
