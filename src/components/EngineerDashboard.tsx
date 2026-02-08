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
    const [isCreating, setIsCreating] = useState(false); // Fix ReferenceError

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
        if (!newProjectName || isCreating) return;

        setIsCreating(true);
        console.log('Starting project creation:', newProjectName, newProjectType);

        // Safety timeout wrapper
        const createWithTimeout = async () => {
            // 1. Create Project
            const projectRef = await addDocument('projects', {
                name: newProjectName,
                type: newProjectType,
                startDate: new Date().toISOString()
            });
            console.log('Project created:', projectRef.id);

            // 2. Create Tasks from Template
            const templateTasks = ganttTemplates[newProjectType];
            if (!templateTasks) {
                throw new Error('Invalid template type');
            }

            console.log('Creating tasks:', templateTasks.length);
            const batchPromises = templateTasks.map(t =>
                addDocument('tasks', {
                    ...t,
                    projectId: projectRef.id,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                })
            );

            await Promise.all(batchPromises);
            console.log('All tasks created successfully');

            return projectRef;
        };

        try {
            // Race against a 5-second timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timed out - check connection')), 5000)
            );

            const projectRef = await Promise.race([
                createWithTimeout(),
                timeoutPromise
            ]) as any;

            // AUTO-SELECT the new project so data shows immediately
            if (projectRef?.id) {
                setSelectedProject({
                    id: projectRef.id,
                    name: newProjectName,
                    type: newProjectType,
                    startDate: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project: ' + (error as Error).message);
        } finally {
            // Always close the modal to prevent "stuck" state
            console.log('Finally block executed - closing modal');
            setIsCreating(false);
            setShowNewProjectModal(false);
            setNewProjectName('');
        }
    };

    const getRiskColor = (flag: string) => {
        switch (flag) {
            case 'RED': return 'text-red-700 bg-red-50 border-red-100';
            case 'YELLOW': return 'text-yellow-700 bg-yellow-50 border-yellow-100';
            case 'GREEN': return 'text-green-700 bg-green-50 border-green-100';
            default: return 'text-gray-500 bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="min-h-screen bg-cream p-8 font-sans">
            <WhatsAppAlert tasks={tasks.map(t => ({
                ...t,
                riskFlag: computeRiskScore({ id: t.id, name: t.name }, []).flag
            }))} />
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                    <div>
                        <h1 className="text-4xl font-serif text-primary-black tracking-tight mb-2">Engineer Dashboard</h1>
                        <p className="text-gray-500 font-light">Overview of active construction sites</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                if (confirm('Reset all demo data? This will clear your projects.')) {
                                    localStorage.removeItem('constructrack_mock_db_v2');
                                    window.location.reload();
                                }
                            }}
                            className="text-xs text-red-400 hover:text-red-600 font-medium px-4 py-2"
                        >
                            Reset Benchmark
                        </button>
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="flex items-center gap-2 bg-primary-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors shadow-lg shadow-black/5"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

                    {/* Sidebar: Projects List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="font-serif text-xl text-primary-black">Projects</h2>
                            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{projects.length}</span>
                        </div>

                        <div className="space-y-3">
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProject(project)}
                                    className={`p-5 rounded-2xl cursor-pointer transition-all border ${selectedProject?.id === project.id
                                        ? 'bg-white border-primary-black shadow-md'
                                        : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`font-medium text-lg mb-1 ${selectedProject?.id === project.id ? 'text-primary-black' : 'text-gray-600'}`}>{project.name}</div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400 capitalize">{project.type}</span>
                                        {selectedProject?.id === project.id && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                    </div>
                                </div>
                            ))}

                            {projects.length === 0 && (
                                <div className="text-center p-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-2xl">
                                    No projects yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">
                        {selectedProject ? (
                            <>
                                {/* Project Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Total Tasks</div>
                                        <div className="text-4xl font-serif text-primary-black">{tasks.length}</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Completion</div>
                                        <div className="text-4xl font-serif text-primary-black">
                                            {Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">App Access</div>
                                            <div className="text-sm text-gray-500">Scan to join</div>
                                        </div>
                                        <QRCodeSVG value={`${window.location.origin}/worker/${selectedProject.id}`} size={64} className="opacity-80" />
                                    </div>
                                </div>

                                {/* Visualizations Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                        <h3 className="font-serif text-lg mb-4">Timeline</h3>
                                        <GanttChart tasks={tasks} projectStartDate={selectedProject.startDate} />
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-[400px]">
                                        <h3 className="font-serif text-lg mb-4 absolute z-10 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg">Live Activity</h3>
                                        <LiveMap photos={[
                                            {
                                                id: '1',
                                                url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=300',
                                                location: { latitude: 37.7749, longitude: -122.4194 },
                                                caption: 'Foundation Work',
                                                timestamp: Date.now()
                                            }
                                        ]} />
                                    </div>
                                </div>

                                {/* Task List */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-gray-100">
                                        <h3 className="font-serif text-xl text-primary-black">Task Status</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50/50 text-gray-500">
                                                <tr>
                                                    <th className="px-8 py-4 font-medium tracking-wide">Task Name</th>
                                                    <th className="px-8 py-4 font-medium tracking-wide">Duration</th>
                                                    <th className="px-8 py-4 font-medium tracking-wide">Risk</th>
                                                    <th className="px-8 py-4 font-medium tracking-wide">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {tasks.map(task => {
                                                    const taskPhotos = photos.filter(p => p.taskId === task.id);
                                                    const mockAnalysis = computeRiskScore({ id: task.id, name: task.name }, taskPhotos);

                                                    return (
                                                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-8 py-5 font-medium text-primary-black">{task.name}</td>
                                                            <td className="px-8 py-5 text-gray-500">{task.expectedDays} days</td>
                                                            <td className="px-8 py-5">
                                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(mockAnalysis.flag)}`}>
                                                                    {mockAnalysis.flag === 'RED' && <AlertTriangle className="w-3 h-3" />}
                                                                    {mockAnalysis.flag === 'YELLOW' && <Clock className="w-3 h-3" />}
                                                                    {mockAnalysis.flag === 'GREEN' && <CheckCircle className="w-3 h-3" />}
                                                                    {mockAnalysis.reason || 'No Data'}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                                  ${task.status === 'completed' ? 'bg-green-50 text-green-700' :
                                                                        task.status === 'in-progress' ? 'bg-blue-50 text-blue-700' :
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
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 min-h-[500px]">
                                <BarChart3 className="w-16 h-16 mb-4 text-gray-200" />
                                <p className="font-serif text-lg text-gray-500">Select a project to view details</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* New Project Modal */}
                {showNewProjectModal && (
                    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
                            <h2 className="text-2xl font-serif font-bold mb-6 text-primary-black">New Project</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project Name</label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-black/10 outline-none text-primary-black placeholder-gray-400 transition-all font-serif text-lg"
                                        placeholder="e.g., Downtown Metro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Template Type</label>
                                    <select
                                        value={newProjectType}
                                        onChange={e => setNewProjectType(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-black/10 outline-none text-primary-black cursor-pointer"
                                    >
                                        {Object.keys(ganttTemplates).map(type => (
                                            <option key={type} value={type} className="capitalize">{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 justify-end mt-8">
                                    <button
                                        onClick={() => setShowNewProjectModal(false)}
                                        className="px-6 py-3 text-gray-500 hover:bg-gray-50 rounded-full font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={!newProjectName || isCreating}
                                        className="px-8 py-3 bg-primary-black text-white rounded-full font-medium hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-black/10 flex items-center justify-center min-w-[120px]"
                                    >
                                        {isCreating ? 'Creating...' : 'Create'}
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
