import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Queue, QueueIns } from "@/integrations/supabase/schema";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getQueueTypeLabel, getPharmacyQueueTypes, getInsQueueTypes } from "@/utils/queueTypeUtils";

interface QueueCompositionChartProps {
  waitingQueues: Queue[];
  waitingInsQueues?: QueueIns[];
}

const chartConfig = {
  count: {
    label: "จำนวนคิว",
    color: "hsl(var(--chart-3))",
  },
};

const ChartComponent: React.FC<{ data: any[] }> = ({ data }) => {
  if (data.length === 0 || !data.some((item) => item.count > 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        ไม่มีคิวรอในขณะนี้
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            dataKey="type"
            type="category"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            width={50}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `ประเภท: ${value}`}
                formatter={(value, name) => [
                  `${value} `,
                  chartConfig.count.label,
                ]}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

const QueueCompositionChart: React.FC<QueueCompositionChartProps> = ({
  waitingQueues,
  waitingInsQueues = [],
}) => {
  const [pharmacyData, setPharmacyData] = React.useState([]);
  const [insData, setInsData] = React.useState([]);

  React.useEffect(() => {
    const getType = async () => {
      // Pharmacy Queue Data
      const pharmacyQueueTypes = await getPharmacyQueueTypes();
      const pharmacyChartData = pharmacyQueueTypes.map((queueType) => {
        const count = waitingQueues.filter(
          (q) => q.type === queueType.code
        ).length;
        return {
          type: queueType.name,
          count: count,
        };
      });
      setPharmacyData(pharmacyChartData);

      // INS Queue Data
      const insQueueTypes = await getInsQueueTypes();
      const insChartData = insQueueTypes.map((queueType) => {
        const count = waitingInsQueues.filter(
          (q) => q.type === queueType.code
        ).length;
        return {
          type: queueType.name,
          count: count,
        };
      });
      setInsData(insChartData);
    };
    getType();
  }, [waitingQueues, waitingInsQueues]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pharmacy Queue Chart */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">คิวรับยา</h3>
        <ChartComponent data={pharmacyData} />
      </div>

      {/* INS Queue Chart */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">คิวตรวจ</h3>
        <ChartComponent data={insData} />
      </div>
    </div>
  );
};

export default QueueCompositionChart;
