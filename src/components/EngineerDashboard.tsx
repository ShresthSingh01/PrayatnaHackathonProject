import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, BarChart3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useFirebase } from '../hooks/useFirebase';
import { computeRiskScore } from '../lib/delayLogic';
import ganttTemplates from '../data/ganttTemplates.json';
import { where } from 'firebase/firestore';
import GanttChart from './GanttChart';
import LiveMap from './LiveMap';
import WhatsAppAlert from './WhatsAppAlert';

// Types
interface Project {
    id: string;
    name: string;
    type: keyof typeof ganttTemplates;
    startDate: string;
}

interface Task {
    id: string;
    name: string;
    expectedDays: number;
    dependencies: string[];
    projectId: string;
    status: 'pending' | 'in-progress' | 'completed';
    riskFlag?: 'RED' | 'YELLOW' | 'GREEN';
}

const EngineerDashboard = () => {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);

    const { addDocument, useRealtime } = useFirebase();

    // Realtime Data
    const { data: projects } = useRealtime<Project>('projects');
    const { data: tasks } = useRealtime<Task>(
        'tasks',
        selectedProject ? [where('projectId', '==', selectedProject.id)] : []
    );
    const { data: photos } = useRealtime<any>(
        'photos',
        selectedProject ? [where('projectId', '==', selectedProject.id)] : []
    );

    // New Project State
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectType, setNewProjectType] = useState<keyof typeof ganttTemplates>('metro');

    const handleCreateProject = async () => {
        if (!newProjectName) return;

        try {
            // 1. Create Project
            const projectRef = await addDocument('projects', {
                name: newProjectName,
                type: newProjectType,
                startDate: new Date().toISOString()
            });

            // 2. Create Tasks from Template
            const templateTasks = ganttTemplates[newProjectType];
            const batchPromises = templateTasks.map(t =>
                addDocument('tasks', {
                    ...t,
                    projectId: projectRef.id,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                })
            );

            await Promise.all(batchPromises);

            setShowNewProjectModal(false);
            setNewProjectName('');
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project');
        }
    };

    const getRiskColor = (flag: string) => {
        switch (flag) {
            case 'RED': return 'text-red-500 bg-red-50 border-red-200';
            case 'YELLOW': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            case 'GREEN': return 'text-green-500 bg-green-50 border-green-200';
            default: return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <WhatsAppAlert tasks={tasks.map(t => ({
                ...t,
                riskFlag: computeRiskScore({ id: t.id, name: t.name }, []).flag
            }))} />
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Engineer Dashboard</h1>
                        <p className="text-gray-500">Manage projects and monitor real-time progress</p>
                    </div>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                    <a
                        href="/worker"
                        target="_blank"
                        className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Worker App
                    </a>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar: Projects List */}
                    <div className="space-y-4">
                        <h2 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Active Projects</h2>
                        <div className="space-y-2">
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProject(project)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProject?.id === project.id
                                        ? 'bg-white border-blue-500 shadow-md transform scale-[1.02]'
                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-medium text-gray-900">{project.name}</div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-500 capitalize">{project.type}</span>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                                    </div>
                                </div>
                            ))}

                            {projects.length === 0 && (
                                <div className="text-center p-8 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                                    No projects yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {selectedProject ? (
                            <>
                                {/* Project Overview Card */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedProject.name}</h2>
                                        <p className="text-gray-500 text-sm mb-6">Started {new Date(selectedProject.startDate).toLocaleDateString()}</p>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-xl">
                                                <div className="text-gray-500 text-xs mb-1">Tasks</div>
                                                <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-xl">
                                                <div className="text-gray-500 text-xs mb-1">Progress</div>
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) || 0}%
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-xl">
                                                <div className="text-gray-500 text-xs mb-1">Delays</div>
                                                <div className="text-2xl font-bold text-red-500">
                                                    {/* Placeholder for delay count logic */}
                                                    0
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR Code Section */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center gap-3">
                                        <QRCodeSVG value={`${window.location.origin}/worker/${selectedProject.id}`} size={120} />
                                        <span className="text-xs font-mono text-gray-500">{selectedProject.id}</span>
                                        <span className="text-xs font-medium text-blue-600">Scan to Open Worker App</span>
                                    </div>
                                </div>

                                {/* Visualizations Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                    {selectedProject && (
                                        <>
                                            <GanttChart tasks={tasks} projectStartDate={selectedProject.startDate} />
                                            <LiveMap photos={[
                                                {
                                                    id: '1',
                                                    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=300',
                                                    location: { latitude: 37.7749, longitude: -122.4194 },
                                                    caption: 'Foundation Work',
                                                    timestamp: Date.now()
                                                }
                                            ]} />
                                        </>
                                    )}
                                </div>

                                {/* Task List */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800">Task Timeline</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium">Task Name</th>
                                                    <th className="px-6 py-3 font-medium">Expected Days</th>
                                                    <th className="px-6 py-3 font-medium">Risk Analysis</th>
                                                    <th className="px-6 py-3 font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {tasks.map(task => {
                                                    // Mock analysis for now, would normally fetch analyzed photos for this task
                                                    const taskPhotos = photos.filter(p => p.taskId === task.id);

                                                    // Add fallback for demo if no photos yet (keep it neutral/grey instead of red)
                                                    // Or act strictly (Red if no photos)
                                                    const mockAnalysis = computeRiskScore({ id: task.id, name: task.name }, taskPhotos);

                                                    return (
                                                        <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 font-medium text-gray-900">{task.name}</td>
                                                            <td className="px-6 py-4 text-gray-500">{task.expectedDays}d</td>
                                                            <td className="px-6 py-4">
                                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(mockAnalysis.flag)}`}>
                                                                    {mockAnalysis.flag === 'RED' && <AlertTriangle className="w-3 h-3" />}
                                                                    {mockAnalysis.flag === 'YELLOW' && <Clock className="w-3 h-3" />}
                                                                    {mockAnalysis.flag === 'GREEN' && <CheckCircle className="w-3 h-3" />}
                                                                    {mockAnalysis.reason || 'No Data'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 rounded text-xs capitalize
                                  ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                                            'bg-gray-100 text-gray-600'}`}>
                                                                    {task.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                <BarChart3 className="w-16 h-16 mb-4 text-gray-300" />
                                <p>Select a project to view dashboard</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* New Project Modal */}
                {showNewProjectModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g., Downtown Metro Line"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                                    <select
                                        value={newProjectType}
                                        onChange={e => setNewProjectType(e.target.value as any)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {Object.keys(ganttTemplates).map(type => (
                                            <option key={type} value={type} className="capitalize">{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 justify-end mt-6">
                                    <button
                                        onClick={() => setShowNewProjectModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={!newProjectName}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngineerDashboard;
