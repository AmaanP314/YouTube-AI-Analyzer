import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-youtube-dark-tertiary p-3 rounded-md border border-youtube-gray-border shadow-lg text-xs">
        <p className="font-semibold text-youtube-gray-primary mb-1 truncate max-w-xs">
          {label}
        </p>
        <p className="text-youtube-gray-secondary">{`Engagement: ${payload[0].value}%`}</p>
      </div>
    );
  }
  return null;
};

export default function EngagementRateChart({ videoData }) {
  const chartData = useMemo(() => {
    if (!videoData || videoData.length === 0) return [];
    return videoData
      .map((v) => ({
        ...v,
        engagementRate: parseFloat(v.likesPercentage?.toFixed(2) || 0), // Use camelCase key
        truncatedTitle:
          v.title.length > 20 ? `${v.title.substring(0, 20)}...` : v.title,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);
  }, [videoData]);

  return (
    <div className="p-3 bg-youtube-dark-secondary rounded-xl mt-4">
      <h3 className="text-sm font-semibold text-youtube-gray-primary mb-4 text-center">
        Engagement Rate (%)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <div
          style={{
            width: "100%",
            height: "100%",
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(100, chartData.length * 50)}%`,
              height: "100%",
            }}
          >
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -20, bottom: 50 }}
            >
              <XAxis
                dataKey="truncatedTitle"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10, fill: "#aaa" }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: "#aaa" }} unit="%" />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(100,100,100,0.1)" }}
              />
              <Bar
                dataKey="engagementRate"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.engagementRate > 3
                        ? "#22c55e"
                        : entry.engagementRate > 1.5
                        ? "#eab308"
                        : "#ef4444"
                    }
                  />
                ))}
                <LabelList
                  dataKey="engagementRate"
                  position="top"
                  style={{ fill: "#aaa", fontSize: 10 }}
                  formatter={(value) => `${value}%`}
                />
              </Bar>
            </BarChart>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
