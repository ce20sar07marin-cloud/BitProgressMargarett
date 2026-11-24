import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

const GRID_SPACING = 24;
const DOT_RADIUS = 1.4;

export default function DotGridBackground() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { isDark } = useTheme();
  const colors = useColors();
  const columns = Math.ceil(size.width / GRID_SPACING);
  const rows = Math.ceil(size.height / GRID_SPACING);

  const handleLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSize((current) =>
      current.width === layout.width && current.height === layout.height
        ? current
        : { width: layout.width, height: layout.height },
    );
  };

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.background, zIndex: 0 },
      ]}
      onLayout={handleLayout}
    >
      <Svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
      >
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: columns }, (_, column) => (
            <Circle
              key={`${row}-${column}`}
              cx={column * GRID_SPACING + GRID_SPACING / 2}
              cy={row * GRID_SPACING + GRID_SPACING / 2}
              r={DOT_RADIUS}
              fill={isDark ? "#716D8A" : "#CBD5E1"}
              opacity={isDark ? 0.42 : 0.72}
            />
          )),
        )}
      </Svg>
    </View>
  );
}
