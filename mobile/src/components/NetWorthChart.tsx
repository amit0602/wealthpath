import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

interface Snapshot {
  snapshotDate: string; // YYYY-MM-DD
  totalCorpus: number;
}

interface Props {
  snapshots: Snapshot[];
  width: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatAxis = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
  return `₹${(val / 1000).toFixed(0)}K`;
};

export function NetWorthChart({ snapshots, width }: Props) {
  if (snapshots.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Check back after your portfolio is updated a few times to see your net worth trend.
        </Text>
      </View>
    );
  }

  const CHART_HEIGHT = 120;
  const PADDING_LEFT = 44;
  const PADDING_RIGHT = 8;
  const PADDING_TOP = 12;
  const PADDING_BOTTOM = 20;
  const chartW = width - PADDING_LEFT - PADDING_RIGHT;
  const chartH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const values = snapshots.map((s) => s.totalCorpus);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    PADDING_LEFT + (i / (snapshots.length - 1)) * chartW;

  const toY = (val: number) =>
    PADDING_TOP + chartH - ((val - minVal) / range) * chartH;

  const points = snapshots.map((s, i) => `${toX(i)},${toY(s.totalCorpus)}`).join(' ');

  // Y-axis labels: min and max
  const yLabels = [
    { val: minVal, y: toY(minVal) },
    { val: maxVal, y: toY(maxVal) },
  ];

  // X-axis labels: first, middle, last
  const xIndices = [0, Math.floor(snapshots.length / 2), snapshots.length - 1];

  const isUp = values[values.length - 1] >= values[0];

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* Y-axis labels */}
        {yLabels.map(({ val, y }) => (
          <SvgText
            key={val}
            x={PADDING_LEFT - 4}
            y={y + 4}
            fontSize={9}
            fill="#9CA3AF"
            textAnchor="end"
          >
            {formatAxis(val)}
          </SvgText>
        ))}

        {/* Baseline guide */}
        <Line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + chartH}
          x2={PADDING_LEFT + chartW}
          y2={PADDING_TOP + chartH}
          stroke="#F3F4F6"
          strokeWidth={1}
        />

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={isUp ? '#1B4332' : '#EF4444'}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {snapshots.map((s, i) => (
          <Circle
            key={s.snapshotDate}
            cx={toX(i)}
            cy={toY(s.totalCorpus)}
            r={i === snapshots.length - 1 ? 4 : 2.5}
            fill={isUp ? '#1B4332' : '#EF4444'}
          />
        ))}

        {/* X-axis labels */}
        {xIndices.map((idx) => {
          const date = snapshots[idx].snapshotDate; // YYYY-MM-DD
          const monthIdx = parseInt(date.slice(5, 7), 10) - 1;
          return (
            <SvgText
              key={idx}
              x={toX(idx)}
              y={CHART_HEIGHT - 2}
              fontSize={9}
              fill="#9CA3AF"
              textAnchor="middle"
            >
              {MONTH_LABELS[monthIdx]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { paddingVertical: 16, alignItems: 'center' },
  placeholderText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});
