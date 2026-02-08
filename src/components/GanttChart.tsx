import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { addDays, parseISO } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

interface Task {
    id: string;
    name: string;
    expectedDays: number;
    status: 'pending' | 'in-progress' | 'completed';
}

interface GanttChartProps {
    tasks: Task[];
    projectStartDate: string;
}

const GanttChart = ({ tasks, projectStartDate }: GanttChartProps) => {
    // Calculate start/end dates for each task based on dependencies and duration
    // For MVP/Template visualization, we'll assume linear progression for simplicity if dependencies aren't strictly resolved here.
    // In a real app, we'd run a critical path algorithm or simple accumulation.
    // Let's do simple accumulation assuming list order is roughly sequential for the templates we have.

    let currentOffset = 0;
    const data = tasks.map(task => {
        const start = addDays(parseISO(projectStartDate), currentOffset);
        const end = addDays(start, task.expectedDays);
        currentOffset += task.expectedDays; // Strictly sequential for visualization

        // Determine color
        let color = 'rgba(209, 213, 219, 0.8)'; // Gray - Pending
        if (task.status === 'in-progress') color = 'rgba(59, 130, 246, 0.8)'; // Blue
        if (task.status === 'completed') color = 'rgba(34, 197, 94, 0.8)'; // Green

        return {
            x: [start.getTime(), end.getTime()],
            y: task.name,
            status: task.status,
            color
        };
    });

    const chartData = {
        labels: tasks.map(t => t.name),
        datasets: [
            {
                label: 'Project Timeline',
                data: data,
                backgroundColor: data.map(d => d.color),
                barPercentage: 0.5,
                borderRadius: 4,
                borderSkipped: false,
            },
        ],
    };

    const options: any = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const start = new Date(context.raw.x[0]).toLocaleDateString();
                        const end = new Date(context.raw.x[1]).toLocaleDateString();
                        return `${context.raw.y}: ${start} - ${end}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'month',
                },
                min: parseISO(projectStartDate).getTime(),
            },
        },
    };

    return (
        <div className="h-[500px] w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Gantt Chart</h3>
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default GanttChart;
