import React from "react";

interface CircleIconProps {
  color: string;
  icon: React.ReactNode;
  size?: number;
}

export const CircleIcon = ({ color, size = 16, icon }: CircleIconProps) => {
  return (
    <div
      className="p-3 rounded-full"
      style={{
        backgroundColor: `${color}20`, // 20 is hex for 12% opacity
        width: `${size}px`,
        height: `${size}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ color: color }}>{icon}</div>
    </div>
  );
};
