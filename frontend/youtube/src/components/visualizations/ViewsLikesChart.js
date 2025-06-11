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
  Cell,
} from "recharts";

const formatAxisTick = (tick) => {
  if (tick >= 1000000) return `${tick / 1000000}M`;
  if (tick >= 1000) return `${tick / 1000}K`;
  return tick.toLocaleString();
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
        <p style={{ color: "#22c55e" }}>{`Likes: ${
          payload[1]?.value?.toLocaleString() || "N/A"
        }`}</p>
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

export default function ViewsLikesChart({
  videoData,
  onBarClick,
  highlightedVideoId,
}) {
  const chartData = useMemo(() => {
    if (!videoData || videoData.length === 0) return [];
    return videoData.map((v) => ({
      ...v,
      truncatedTitle: trimTitle(v.title, 25),
    }));
  }, [videoData]);

  return (
    <div className="p-3 bg-youtube-dark-secondary rounded-xl">
      <h3 className="text-sm font-semibold text-youtube-gray-primary mb-4 text-center">
        Views vs. Likes
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: -25, left: -25, bottom: 0 }}
          onClick={(state) => {
            if (state && state.activePayload && state.activePayload.length) {
              const clickedVideo = state.activePayload[0].payload;
              if (clickedVideo && onBarClick) {
                onBarClick(clickedVideo);
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
          <XAxis
            dataKey="truncatedTitle"
            tick={false}
            axisLine={{ stroke: "#303030" }}
          />
          <YAxis
            yAxisId="left"
            stroke="#8884d8"
            tickFormatter={formatAxisTick}
            tick={{ fontSize: 10, fill: "#aaa" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#22c55e"
            tickFormatter={formatAxisTick}
            tick={{ fontSize: 10, fill: "#aaa" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "10px" }} />
          <Bar
            yAxisId="left"
            dataKey="views"
            name="Views"
            barSize={20}
            onClick={onBarClick}
            cursor="pointer"
            animationDuration={500}
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={entry.id === highlightedVideoId ? "#c084fc" : "#8884d8"}
              />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="likes"
            name="Likes"
            stroke="#22c55e"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.id === highlightedVideoId) {
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#22c55e"
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }
              return <circle cx={cx} cy={cy} r={2} fill="#22c55e" />;
            }}
            activeDot={{ r: 6 }}
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
