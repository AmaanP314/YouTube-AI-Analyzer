import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

const trimTitle = (title, maxLength = 25) => {
  if (!title) return "";
  if (title.length > maxLength) {
    return title.substring(0, maxLength) + "...";
  }
  return title;
};

export default function EngagementRateChart({
  videoData,
  onBarClick,
  highlightedVideoId,
}) {
  const chartData = useMemo(() => {
    if (!videoData || videoData.length === 0) return [];
    return videoData
      .map((v) => ({
        ...v,
        engagementRate: parseFloat(v.likesPercentage?.toFixed(2) || 0),
        truncatedTitle: trimTitle(v.title, 25),
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);
  }, [videoData]);

  const defaultColor = (rate) =>
    rate > 3 ? "#22c55e" : rate > 1.5 ? "#eab308" : "#ef4444";

  return (
    <div className="p-3 bg-youtube-dark-secondary rounded-xl mt-4">
      <h3 className="text-sm font-semibold text-youtube-gray-primary mb-4 text-center">
        Engagement Rate (%)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const clickedData = chartData[state.activeTooltipIndex];
              if (clickedData && onBarClick) {
                onBarClick(clickedData);
              }
            }
          }}
        >
          <XAxis
            dataKey="truncatedTitle"
            tick={false}
            axisLine={{ stroke: "#8C92AC" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "#aaa" }} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="engagementRate"
            onClick={onBarClick}
            cursor="pointer"
            animationDuration={500}
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={
                  entry.id === highlightedVideoId
                    ? "#f472b6"
                    : defaultColor(entry.engagementRate)
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
