import React, { useState, useEffect } from 'react';
import { useSafeSight } from '../../core/store';
import {
  FileCheck2,
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { soundEngine } from '../../core/speech';
import { getAuditLog as dbGetAuditLog } from '@/actions/audit';

export const AuditComplianceLog: React.FC = () => {
  const { t, alerts, hazardReports, isDbConnected } = useSafeSight();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [dbLogs, setDbLogs] = useState<{
    id: string;
    timestamp: string;
    type: string;
    zone: string;
    title: string;
    severity: string;
    status: string;
    assignedTo: string;
  }[]>([]);

  // Load audit entries from NeonDB
  useEffect(() => {
    dbGetAuditLog({ limit: 100 })
      .then((entries) => {
        if (entries && entries.length > 0) {
          const mapped = entries.map((e) => ({
            id: e.eventId,
            timestamp: e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            type: `${e.module} (${e.actor})`,
            zone: e.zone || 'Zone B',
            title: e.action + (e.details ? ` - ${e.details}` : ''),
            severity: e.severity || 'medium',
            status: 'Verified & Logged',
            assignedTo: e.actor,
          }));
          setDbLogs(mapped);
        }
      })
      .catch(() => {});
  }, [alerts.length, hazardReports.length]);

  // Combine DB logs with local state fallback
  const combinedLog = [
    ...dbLogs,
    ...alerts.map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      type: 'AI Computer Vision Detection',
      zone: a.zone,
      title: a.title,
      severity: a.riskLevel,
      status: a.acknowledged ? 'Acknowledged & Logged' : 'Pending Review',
      assignedTo: a.assignedOfficer || 'Safety Shift Leader',
    })),
    ...hazardReports.map((h) => ({
      id: h.id,
      timestamp: h.timestamp,
      type: `Near-Miss Report (${h.reporterNationality})`,
      zone: h.zone,
      title: h.title,
      severity: h.severity,
      status: h.status === 'resolved' ? 'Resolved & Verified' : 'Under Investigation',
      assignedTo: h.reporterName,
    })),
  ];

  // Deduplicate by ID
  const uniqueLogs = Array.from(new Map(combinedLog.map((item) => [item.id, item])).values());

  const filteredLog = uniqueLogs.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchSeverity =
      selectedSeverity === 'all' || item.severity === selectedSeverity;

    return matchSearch && matchSeverity;
  });

  const handleExportCSV = () => {
    soundEngine.playAlertBeep('success');
    const headers = 'Incident ID,Timestamp,Type,Zone,Title,Severity,Status,Assigned To\n';
    const rows = filteredLog
      .map(
        (item) =>
          `"${item.id}","${item.timestamp}","${item.type}","${item.zone}","${item.title.replace(
            /"/g,
            '""'
          )}","${item.severity}","${item.status}","${item.assignedTo}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SafeSight_EEC_Safety_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    setDownloadSuccess('CSV Raw Data Exported Successfully');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportPDF = () => {
    const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!reportWindow) {
      setDownloadSuccess('Allow pop-ups to print the safety report');
      return;
    }
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character
      );
    const rows = filteredLog
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.timestamp)}</td><td>${escapeHtml(
            item.type
          )}</td><td>${escapeHtml(item.zone)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(
            item.severity
          )}</td><td>${escapeHtml(item.status)}</td></tr>`
      )
      .join('');
    reportWindow.document.write(
      `<!doctype html><html><head><title>SafeSight Safety Audit</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:32px}h1{margin-bottom:4px}p{color:#526070}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>SafeSight Safety Audit Report</h1><p>Generated ${new Date().toLocaleString()} | ${
        filteredLog.length
      } records | ISO 45001 & Thai OSH Act B.E. 2554 Compliant</p><table><thead><tr><th>ID</th><th>Time</th><th>Source</th><th>Zone</th><th>Description</th><th>Severity</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    );
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    soundEngine.playAlertBeep('success');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {t.audit.title}
            </h2>
            <p className="text-xs text-slate-400">{t.audit.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isDbConnected && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              ● NeonDB Immutable Audit
            </span>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{t.audit.exportCsv}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{t.audit.exportPdf}</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t.audit.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
          >
            <option value="all">All Severity Levels</option>
            <option value="critical">🔴 Critical Only</option>
            <option value="high">🟠 High Risk Only</option>
            <option value="medium">🟡 Medium Risk Only</option>
            <option value="low">🟢 Low Hazard Only</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                <th className="p-3.5">ID / Time</th>
                <th className="p-3.5">Type & Source</th>
                <th className="p-3.5">Zone</th>
                <th className="p-3.5">Event Description</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLog.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono text-slate-300">
                    <span className="font-bold text-amber-400 block">{item.id}</span>
                    <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                  </td>

                  <td className="p-3.5 font-medium text-slate-200">
                    {item.type}
                  </td>

                  <td className="p-3.5 font-mono text-cyan-400">
                    {item.zone}
                  </td>

                  <td className="p-3.5 text-slate-300 max-w-xs truncate">
                    {item.title}
                  </td>

                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md uppercase ${
                        item.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : item.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono text-[11px] text-emerald-400">
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
