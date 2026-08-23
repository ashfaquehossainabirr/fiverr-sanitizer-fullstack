import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ResetPasswordModal from "../components/ResetPasswordModal.jsx";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return initials.join("") || "?";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function AdminDashboard() {
  const { user: currentUser, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState({ type: "", text: "" });

  const [statusPending, setStatusPending] = useState(null); // user pending activate/deactivate
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [resetTarget, setResetTarget] = useState(null); // user pending password reset

  const [deleteTarget, setDeleteTarget] = useState(null); // user pending deletion
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not load users." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      deactivated: users.filter((u) => !u.isActive).length,
      admins: users.filter((u) => u.role === "admin").length
    }),
    [users]
  );

  const confirmStatusChange = async () => {
    if (!statusPending) return;
    setStatusSubmitting(true);
    const nextIsActive = !statusPending.isActive;
    try {
      const { data } = await api.patch(`/admin/users/${statusPending.id}/status`, {
        isActive: nextIsActive
      });
      setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      setBanner({
        type: "success",
        text: `${data.user.name} is now ${data.user.isActive ? "active" : "deactivated"}.`
      });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not update this user." });
    } finally {
      setStatusSubmitting(false);
      setStatusPending(null);
    }
  };

  const handleResetPassword = async (newPassword) => {
    const { data } = await api.put(`/admin/users/${resetTarget.id}/reset-password`, { newPassword });
    setBanner({ type: "success", text: data.message });
    setResetTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setBanner({ type: "success", text: `${deleteTarget.name} was deleted.` });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not delete this user." });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <span className="sidebar-logo">FS</span>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage every registered user</p>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <Link to="/dashboard" className="admin-back-link">
            ← Back to Workspace
          </Link>
          <button type="button" className="logout-btn admin-logout-btn" onClick={logout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="admin-content">
        {banner.text && (
          <div className={`dashboard-error-banner ${banner.type === "success" ? "success" : ""}`}>
            <span>{banner.text}</span>
            <button type="button" onClick={() => setBanner({ type: "", text: "" })}>✕</button>
          </div>
        )}

        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.total}</span>
            <span className="admin-stat-label">Total Users</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.active}</span>
            <span className="admin-stat-label">Active</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.deactivated}</span>
            <span className="admin-stat-label">Deactivated</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.admins}</span>
            <span className="admin-stat-label">Admins</span>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="dashboard-loading">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="dashboard-loading">
            {users.length === 0 ? "No users have registered yet." : "No users match your search."}
          </div>
        ) : (
          <div className="admin-user-grid">
            {filteredUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <div className="admin-user-card" key={u.id}>
                  <div className="admin-user-card-top">
                    <div className="account-avatar-lg admin-user-avatar">{getInitials(u.name)}</div>
                    <div className="admin-user-identity">
                      <h3>
                        {u.name}
                        {isSelf && <span className="admin-you-tag">You</span>}
                      </h3>
                      <p>{u.email}</p>
                    </div>
                  </div>

                  <div className="admin-user-badges">
                    <span className={`admin-badge role-${u.role}`}>{u.role}</span>
                    <span className={`admin-badge status-${u.isActive ? "active" : "inactive"}`}>
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                    <span className="admin-badge admin-badge-date">Joined {formatDate(u.createdAt)}</span>
                  </div>

                  <div className="admin-user-actions">
                    <button
                      type="button"
                      className={`admin-action-btn ${u.isActive ? "warn" : "accent"}`}
                      disabled={isSelf}
                      title={isSelf ? "You can't deactivate your own account" : undefined}
                      onClick={() => setStatusPending(u)}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button type="button" className="admin-action-btn" onClick={() => setResetTarget(u)}>
                      Reset Password
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn danger"
                      disabled={isSelf}
                      title={isSelf ? "You can't delete your own account here" : undefined}
                      onClick={() => setDeleteTarget(u)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {statusPending && (
        <ConfirmModal
          title={
            statusPending.isActive
              ? `Deactivate ${statusPending.name}?`
              : `Activate ${statusPending.name}?`
          }
          message={
            statusPending.isActive
              ? "They won't be able to log in until an admin reactivates their account."
              : "This restores their ability to log in and use the app."
          }
          confirmLabel={statusPending.isActive ? "Deactivate" : "Activate"}
          variant={statusPending.isActive ? "danger" : "default"}
          loading={statusSubmitting}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusPending(null)}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onConfirm={handleResetPassword}
          onCancel={() => setResetTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.name}?`}
          message="This permanently deletes their account, tabs, and saved messages. This action cannot be undone."
          confirmLabel="Delete User"
          variant="danger"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
