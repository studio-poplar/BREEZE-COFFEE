"use client";

import { useEffect, useMemo, useState } from "react";
import type { PaymentMethod } from "@/lib/types";
import type { SalesReport as SalesReportData } from "@/lib/data/sales";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "現金",
  card: "カード",
  emoney: "電子マネー",
  qr: "QR決済",
};

function toJstDateString(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return toJstDateString(d);
}

function todayJst(): string {
  return toJstDateString(new Date());
}

type PresetKey = "today" | "yesterday" | "week" | "month" | "last7" | "custom";

function presetRange(key: PresetKey): { from: string; to: string } {
  const today = todayJst();
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "week": {
      const dow = new Date(`${today}T00:00:00+09:00`).getUTCDay(); // 0=Sun..6=Sat
      const sinceMonday = (dow + 6) % 7;
      return { from: addDays(today, -sinceMonday), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "last7":
      return { from: addDays(today, -6), to: today };
    default:
      return { from: today, to: today };
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "yesterday", label: "昨日" },
  { key: "week", label: "今週" },
  { key: "month", label: "今月" },
  { key: "last7", label: "過去7日" },
  { key: "custom", label: "期間指定" },
];

function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const LOW_MARGIN_THRESHOLD = 30;
const HIGH_MARGIN_THRESHOLD = 60;

function marginBadgeClass(pct: number): string {
  if (pct >= HIGH_MARGIN_THRESHOLD) return "bg-emerald-50 text-emerald-700";
  if (pct >= LOW_MARGIN_THRESHOLD) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function SalesReport({ storeId }: { storeId: string }) {
  const [preset, setPreset] = useState<PresetKey>("today");
  const [range, setRange] = useState(() => presetRange("today"));
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Refetching in response to storeId/range changing, not deriving state
    // from props/state — the pattern this rule otherwise guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/admin/sales?store_id=${storeId}&from=${range.from}&to=${range.to}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => setReport(d.report))
      .catch(() => setError("売上データの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [storeId, range]);

  function selectPreset(key: PresetKey) {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  }

  const maxDaily = useMemo(
    () => Math.max(1, ...(report?.daily.map((d) => d.revenue) ?? [0])),
    [report]
  );

  const lowMarginItems = useMemo(
    () => report?.topItems.filter((i) => i.marginPct < LOW_MARGIN_THRESHOLD) ?? [],
    [report]
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-bold">売上管理</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => selectPreset(p.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              preset === p.key ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="mb-6 flex items-center gap-2">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <span className="text-zinc-400">〜</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={todayJst()}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <p className="mb-4 text-xs text-zinc-400">
        {range.from === range.to ? formatDateLabel(range.from) : `${formatDateLabel(range.from)} 〜 ${formatDateLabel(range.to)}`}
        {" "}・会計済みの注文が対象(未会計は含みません)
      </p>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading && !report && <p className="text-sm text-zinc-400">読み込み中...</p>}

      {report && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">売上サマリー</h2>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500">売上合計</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                ¥{report.summary.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500">注文件数</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{report.summary.orderCount}件</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500">客単価</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                ¥{report.summary.averageOrderValue.toLocaleString()}
              </p>
            </div>
          </div>

          <h2 className="mb-2 text-sm font-semibold text-zinc-500">収益性(原価・粗利)</h2>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500">原価合計</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-orange-600">
                ¥{report.summary.totalCost.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-400">原価率 {report.summary.costRatio.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500">粗利益</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                ¥{report.summary.grossProfit.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500">粗利率</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                {report.summary.profitMarginPct.toFixed(1)}%
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-1.5 rounded-full bg-emerald-600"
                  style={{ width: `${Math.min(100, Math.max(0, report.summary.profitMarginPct))}%` }}
                />
              </div>
            </div>
          </div>

          {report.daily.length > 1 && (
            <section className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-zinc-500">売上・原価の推移</h2>
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="mb-3 flex gap-4 text-xs text-zinc-500">
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-zinc-900 align-[-1px]" />粗利</span>
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-orange-300 align-[-1px]" />原価</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {report.daily.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-sm">
                      <span className="w-10 shrink-0 text-xs text-zinc-400">{formatDateLabel(d.date)}</span>
                      <div className="flex h-5 flex-1 overflow-hidden rounded bg-zinc-100">
                        <div
                          className="h-5 bg-orange-300"
                          style={{ width: `${(d.cost / maxDaily) * 100}%` }}
                        />
                        <div
                          className="h-5 bg-zinc-900"
                          style={{ width: `${(d.profit / maxDaily) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right tabular-nums text-zinc-600">
                        ¥{d.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">商品別 収益性</h2>
            {report.topItems.length === 0 ? (
              <p className="text-sm text-zinc-400">データがありません</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-xs text-zinc-500">
                      <th className="px-3 py-2.5 text-left font-normal">商品</th>
                      <th className="px-3 py-2.5 text-right font-normal">販売数</th>
                      <th className="px-3 py-2.5 text-right font-normal">売上</th>
                      <th className="px-3 py-2.5 text-right font-normal">原価</th>
                      <th className="px-3 py-2.5 text-right font-normal">粗利</th>
                      <th className="px-3 py-2.5 text-right font-normal">粗利率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topItems.map((item, i) => (
                      <tr key={item.itemName} className="border-t border-zinc-100">
                        <td className="px-3 py-2.5">
                          <span className="mr-1.5 text-xs text-zinc-400">{i + 1}</span>
                          {item.itemName}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">{item.qty}点</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">¥{item.revenue.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">
                          ¥{item.cost.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          ¥{item.profit.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${marginBadgeClass(item.marginPct)}`}>
                            {item.marginPct.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {lowMarginItems.length > 0 && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                粗利率{LOW_MARGIN_THRESHOLD}%未満の商品があります({lowMarginItems.map((i) => i.itemName).join("、")})。価格または原価の見直しをおすすめします。
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">支払い方法別</h2>
            {report.byPaymentMethod.length === 0 ? (
              <p className="text-sm text-zinc-400">データがありません</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.byPaymentMethod.map((p) => (
                  <li
                    key={p.paymentMethod}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-2.5 text-sm"
                  >
                    <span>{PAYMENT_LABEL[p.paymentMethod]}</span>
                    <span className="text-zinc-500">{p.orderCount}件</span>
                    <span className="font-medium tabular-nums">¥{p.revenue.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
