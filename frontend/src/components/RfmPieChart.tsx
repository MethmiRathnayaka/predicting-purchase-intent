"use client";
import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function RfmPieChart({ clusters }: { clusters: any[] }) {
  // Prepare data for pie chart
  const labels = clusters.map((c) => `Cluster ${c.Cluster}`);
  const data = clusters.map((c) => c.Num_Customers);
  const backgroundColors = [
    "#00e6e6",
    "#a259e6",
    "#23283a",
    "#ffb347",
    "#ff6961",
    "#6ee7b7",
    "#f472b6",
  ];

  const pieData = {
    labels,
    datasets: [
      {
        label: "Num Customers",
        data,
        backgroundColor: backgroundColors.slice(0, clusters.length),
        borderColor: "#1a0824",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ width: 250, height: 250 }}>
        <Pie
          data={pieData}
          options={{
            plugins: {
              legend: {
                labels: {
                  color: "#b0b3b8",
                  font: { size: 14 },
                },
              },
            },
            maintainAspectRatio: false,
          }}
          width={250}
          height={250}
        />
      </div>
      <div className="mt-2 text-[#b0b3b8] text-sm">
        RFM Segment Distribution
      </div>
    </div>
  );
}
