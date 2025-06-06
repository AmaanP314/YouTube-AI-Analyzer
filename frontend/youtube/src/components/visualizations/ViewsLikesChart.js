import React, { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const formatAxisTick = (tick) => {
  if (tick >= 1000000) return `${tick / 1000000}M`;
  if (tick >= 1000) return `${tick / 1000}K`;
  return tick;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-youtube-dark-tertiary p-3 rounded-md border border-youtube-gray-border shadow-lg text-xs">
        <p className="font-semibold text-youtube-gray-primary mb-1 truncate max-w-xs">
          {label}
        </p>
        <p style={{ color: "#8884d8" }}>{`Views: ${
          payload[0]?.value?.toLocaleString() || "N/A"
        }`}</p>
        <p style={{ color: "#82ca9d" }}>{`Likes: ${
          payload[1]?.value?.toLocaleString() || "N/A"
        }`}</p>
      </div>
    );
  }
  return null;
};

export default function ViewsLikesChart({ videoData }) {
  const chartData = useMemo(() => {
    if (!videoData || videoData.length === 0) return [];
    return videoData.map((v) => ({
      ...v,
      truncatedTitle:
        v.title.length > 20 ? `${v.title.substring(0, 20)}...` : v.title,
    }));
  }, [videoData]);

  return (
    <div className="p-3 bg-youtube-dark-secondary rounded-xl">
      <h3 className="text-sm font-semibold text-youtube-gray-primary mb-4 text-center">
        Views vs. Likes
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
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
              <XAxis
                dataKey="truncatedTitle"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10, fill: "#aaa" }}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#8884d8"
                tickFormatter={formatAxisTick}
                tick={{ fontSize: 10, fill: "#aaa" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#82ca9d"
                tickFormatter={formatAxisTick}
                tick={{ fontSize: 10, fill: "#aaa" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
              <Bar
                yAxisId="left"
                dataKey="views"
                name="Views"
                barSize={20}
                fill="#8884d8"
                animationDuration={800}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="likes"
                name="Likes"
                stroke="#82ca9d"
                strokeWidth={2}
                animationDuration={800}
              />
            </ComposedChart>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
