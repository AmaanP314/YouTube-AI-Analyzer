import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const SENTIMENT_COLORS = {
  Positive: "#22c55e", // green-500
  Neutral: "#eab308", // yellow-500
  Negative: "#ef4444", // red-500
};

export default function SentimentDistributionChart({ sentiments }) {
  const chartData = useMemo(() => {
    if (!sentiments || sentiments.length === 0) {
      return [];
    }

    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    let validSentimentsCount = 0;

    sentiments.forEach((sentiment) => {
      if (sentiment && counts.hasOwnProperty(sentiment)) {
        counts[sentiment]++;
        validSentimentsCount++;
      }
    });

    if (validSentimentsCount === 0) return [];

    return Object.keys(counts).map((name) => ({
      name,
      count: counts[name],
      percentage: parseFloat(
        ((counts[name] / validSentimentsCount) * 100).toFixed(1)
      ),
      fill: SENTIMENT_COLORS[name],
    }));
  }, [sentiments]);

  if (chartData.length === 0) {
    return (
      <div className="p-4 bg-youtube-dark-secondary rounded-xl mt-4 text-sm text-youtube-gray-secondary text-center">
        Not enough data to display sentiment chart.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-youtube-dark-tertiary p-2 rounded-md border border-youtube-gray-border shadow-lg text-xs">
          <p className="font-semibold text-youtube-gray-primary">{`${label}`}</p>
          <p style={{ color: payload[0].payload.fill }}>
            {`Count: ${payload[0].value}`}
          </p>
          <p style={{ color: payload[0].payload.fill }}>
            {`Percentage: ${payload[0].payload.percentage}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-3 bg-youtube-dark-secondary rounded-xl mt-4">
      <h3 className="text-sm font-semibold text-youtube-gray-primary mb-3 text-center">
        Comment Sentiment Distribution
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 0, left: -25, bottom: 5 }}
        >
          {/* <CartesianGrid strokeDasharray="3 3" stroke="#303030" /> */}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#aaa" }}
            axisLine={{ stroke: "#303030" }}
            tickLine={{ stroke: "#303030" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#aaa" }}
            axisLine={{ stroke: "#303030" }}
            tickLine={{ stroke: "#303030" }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(100,100,100,0.1)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
            payload={chartData.map((item) => ({
              value: item.name,
              type: "square",
              color: item.fill,
            }))}
          />
          <Bar
            dataKey="count"
            name="Sentiments"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
