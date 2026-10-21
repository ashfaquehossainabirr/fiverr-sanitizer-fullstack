import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { IconArrow, IconBolt, IconCheck, IconDownload, IconSave, IconUsers } from "./icons.jsx";
import Loader from "./Loader.jsx";
import { GoalCard, OfferCalculator } from "./EarningsTools.jsx";
import { daysUntil, formatDay } from "../lib/dates.js";
import { formatCompact } from "../lib/formatNumber.js";

function Stat({ label, value, hint, Icon, tone = "green", trend }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      {hint && (
        <span className="stat-hint">
          {trend && (
            <span className={`stat-trend ${trend}`} aria-hidden="true">
              <IconArrow size={12} />
            </span>
          )}
          {hint}
        </span>
      )}
    </div>
  );
}

const fmtDate = (d) => formatDay(d);

export default function Overview({ refreshKey, onOpenClients, onError }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Send our UTC offset so the server buckets days and the month in our timezone.
        const res = await api.get("/insights", { params: { tzOffset: new Date().getTimezoneOffset() } });
        if (!cancelled) setData(res.data);
      } catch (err) {
        onError?.(err.response?.data?.message || "Could not load your overview.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onError]);

  const exportData = async () => {
    try {
      const res = await api.get("/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sanitizer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError?.(err.response?.data?.message || "Export failed.");
    }
  };

  if (!data) return <Loader label="Loading your overview" />;

  // Same rule as the sidebar badge and Today strip: due today or earlier.
  const dueFollowUps = data.dueFollowUps.filter((c) => daysUntil(c.followUpAt) <= 0);
  const max = Math.max(1, ...data.perDay.map((d) => d.count));
  const delta = data.week.thisWeek - data.week.lastWeek;
  const totalMessages = data.perDay.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Overview</h2>
          <p className="panel-sub">Your week at a glance.</p>
        </div>
        <button type="button" className="btn-ghost btn-with-icon" onClick={exportData}>
          <IconDownload size={15} /> Export backup
        </button>
      </div>

      <div className="stat-grid">
        <Stat Icon={IconSave} tone="green" label="Messages saved" value={formatCompact(data.totals.messages)} hint={`${formatCompact(data.totals.pinned)} pinned`} />
        <Stat
          Icon={IconBolt}
          tone="blue"
          trend={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}
          label="This week"
          value={formatCompact(data.week.thisWeek)}
          hint={delta === 0 ? "same as last week" : `${delta > 0 ? "+" : ""}${formatCompact(delta)} vs last week`}
        />
        <Stat Icon={IconUsers} tone="amber" label="Open orders" value={formatCompact(data.pipeline.openCount)} hint={`${formatCompact(data.pipeline.pipelineValue)} in pipeline`} />
        <Stat Icon={IconCheck} tone="green" label="Completed value" value={formatCompact(data.pipeline.earned)} hint="from completed orders" />
      </div>

      <div className="overview-cols overview-tools">
        <GoalCard earnedThisMonth={data.pipeline.earnedThisMonth || 0} />
        <OfferCalculator />
      </div>

      <div className="overview-cols">
        <section className="overview-card">
          <div className="chart14-head">
            <h3>Messages · last 14 days</h3>
            <span className="chart14-total">
              <strong>{totalMessages}</strong> saved
            </span>
          </div>
          <div className="chart14" role="img" aria-label={`Messages saved per day over the last 14 days: ${totalMessages} in total`}>
            {data.perDay.map((d, i) => {
              const day = new Date(`${String(d.date).slice(0, 10)}T12:00:00`);
              return (
                <div className={`chart14-col ${i === data.perDay.length - 1 ? "is-today" : ""} ${d.count ? "" : "is-empty"}`} key={d.date} title={`${fmtDate(d.date)}: ${d.count}`}>
                  <span className="chart14-val">{d.count || ""}</span>
                  <div className="chart14-track">
                    <div className="chart14-bar" style={{ height: `${d.count ? Math.max(8, (d.count / max) * 100) : 4}%` }} />
                  </div>
                  <span className="chart14-day">{day.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overview-card">
          <h3>Follow-ups due</h3>
          {dueFollowUps.length === 0 ? (
            <p className="muted">You are all caught up. 🎉</p>
          ) : (
            <ul className="mini-list">
              {dueFollowUps.map((c) => (
                <li key={c._id}>
                  <button type="button" onClick={onOpenClients}>
                    <strong>{c.name}</strong>
                    <span>{c.project || "No project"} · {fmtDate(c.followUpAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overview-card">
          <h3>Upcoming deadlines</h3>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="muted">No deadlines set.</p>
          ) : (
            <ul className="mini-list">
              {data.upcomingDeadlines.map((c) => (
                <li key={c._id}>
                  <button type="button" onClick={onOpenClients}>
                    <strong>{c.name}</strong>
                    <span>{c.project || "No project"} · {fmtDate(c.deadline)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overview-card">
          <h3>Most used templates</h3>
          {data.topTemplates.length === 0 || data.topTemplates[0].usageCount === 0 ? (
            <p className="muted">Use a template and it will show up here.</p>
          ) : (
            <ul className="mini-list">
              {data.topTemplates.filter((t) => t.usageCount > 0).map((t) => (
                <li key={t._id}><div><strong>{t.title}</strong><span>{formatCompact(t.usageCount)} uses</span></div></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
